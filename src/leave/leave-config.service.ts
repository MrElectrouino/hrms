import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { LeaveSettingsDto, LeaveTypeDto } from './dto/leave.dto';

/** System Settings > Leave configuration: leave types and organization-wide leave settings. */
@Injectable()
export class LeaveConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  types(onlyActive: boolean) {
    return this.prisma.leaveType.findMany({ where: onlyActive ? { isActive: true } : {}, orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }] });
  }

  settings() {
    return this.prisma.leaveSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  }

  private data(dto: LeaveTypeDto) {
    if (dto.isCompOff && dto.accrual !== 'NONE') throw new BadRequestException('Comp off is earned through attendance, so it has no accrual');
    if (dto.accrual !== 'NONE' && !dto.balanceTracking) throw new BadRequestException('A leave type with accrual must keep a balance');
    return {
      code: dto.code.trim().toUpperCase(),
      name: dto.name.trim(),
      isPaid: dto.isPaid,
      balanceTracking: dto.balanceTracking,
      accrual: dto.accrual,
      annualDays: dto.annualDays,
      allowHalfDay: dto.allowHalfDay,
      allowNegative: dto.allowNegative,
      requiresDocument: dto.requiresDocument,
      documentAfterDays: dto.documentAfterDays,
      maxDaysPerRequest: dto.maxDaysPerRequest ?? null,
      isSandwichEligible: dto.isSandwichEligible,
      isCompOff: dto.isCompOff,
      isActive: dto.isActive ?? true,
    };
  }

  private dup(e: unknown): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException('A leave type with this code or name already exists');
    throw e;
  }

  async create(dto: LeaveTypeDto, user: CurrentUserPayload, ip?: string) {
    try {
      const last = await this.prisma.leaveType.aggregate({ _max: { sortOrder: true } });
      const created = await this.prisma.leaveType.create({ data: { ...this.data(dto), sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_TYPE_CREATED', entityType: 'LeaveType', entityId: String(created.id), ipAddress: ip });
      return created;
    } catch (e) {
      return this.dup(e);
    }
  }

  /** A leave type that has been used (applications, balances, ledger or a policy rule) is kept: switch it off instead. */
  async remove(id: number, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.leaveType.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Leave type not found');
    const [applications, credits, transactions, rules] = await Promise.all([
      this.prisma.leaveApplication.count({ where: { leaveTypeId: id } }),
      this.prisma.leaveCredit.count({ where: { leaveTypeId: id } }),
      this.prisma.leaveTransaction.count({ where: { leaveTypeId: id } }),
      this.prisma.leavePolicyRule.count({ where: { leaveTypeId: id } }),
    ]);
    if (applications + credits + transactions + rules > 0) {
      throw new ConflictException('This leave type has been used (applications, balances or a leave policy), so it cannot be deleted. Switch it off instead.');
    }
    await this.prisma.leaveType.delete({ where: { id } });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_TYPE_DELETED', entityType: 'LeaveType', entityId: String(id), ipAddress: ip });
  }

  async update(id: number, dto: LeaveTypeDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.leaveType.findUnique({ where: { id } }))) throw new NotFoundException('Leave type not found');
    try {
      const updated = await this.prisma.leaveType.update({ where: { id }, data: this.data(dto) });
      await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_TYPE_UPDATED', entityType: 'LeaveType', entityId: String(id), ipAddress: ip, metadata: { sandwichEligible: dto.isSandwichEligible } });
      return updated;
    } catch (e) {
      return this.dup(e);
    }
  }

  async saveSettings(dto: LeaveSettingsDto, user: CurrentUserPayload, ip?: string) {
    const data = { ...dto, compOffExpiryDays: dto.compOffExpiryDays ?? null };
    const saved = await this.prisma.leaveSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_SETTINGS_UPDATED', entityType: 'LeaveSettings', entityId: '1', ipAddress: ip, metadata: { sandwichEnabled: dto.sandwichEnabled } });
    return saved;
  }
}
