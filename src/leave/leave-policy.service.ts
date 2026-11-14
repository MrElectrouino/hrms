import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { LeavePolicyDto } from './dto/leave-policy.dto';
import { validateSlabs } from './entitlement-rules';
import { EntitlementService } from './entitlement.service';

const d = (s: string) => new Date(`${s}T00:00:00Z`);
const iso = (x: Date) => x.toISOString().slice(0, 10);
const withRules = { rules: { include: { leaveType: { select: { name: true, code: true } } } } } satisfies Prisma.LeavePolicyInclude;

/** Leave policies: who they apply to, from when, and the rule for each leave type. */
@Injectable()
export class LeavePolicyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly entitlement: EntitlementService,
  ) {}

  private present(p: Prisma.LeavePolicyGetPayload<{ include: typeof withRules }>, used: boolean) {
    return {
      id: p.id, name: p.name, layer: p.layer, countryCode: p.countryCode, branchId: p.branchId, employeeTypeId: p.employeeTypeId, employeeId: p.employeeId,
      effectiveFrom: iso(p.effectiveFrom), effectiveTo: p.effectiveTo ? iso(p.effectiveTo) : null, priority: p.priority, isActive: p.isActive, note: p.note, used,
      rules: p.rules.map((r) => ({
        id: r.id, leaveTypeId: r.leaveTypeId, leaveType: r.leaveType.name, annualDays: Number(r.annualDays), creditMethod: r.creditMethod, slabs: r.slabs, slabTiming: r.slabTiming,
        proration: r.proration, cutoffDay: r.cutoffDay, rounding: r.rounding, tieRule: r.tieRule, minDays: r.minDays === null ? null : Number(r.minDays), maxDays: r.maxDays === null ? null : Number(r.maxDays),
      })),
    };
  }

  async list() {
    const rows = await this.prisma.leavePolicy.findMany({ orderBy: [{ isActive: 'desc' }, { effectiveFrom: 'desc' }], include: withRules });
    const used = new Set((await this.prisma.leaveEntitlementRun.groupBy({ by: ['policyId'] })).map((r) => r.policyId));
    return rows.map((p) => this.present(p, used.has(p.id)));
  }

  private async check(dto: LeavePolicyDto, selfId?: number) {
    if (dto.effectiveTo && dto.effectiveTo < dto.effectiveFrom) throw new BadRequestException('The end date cannot be before the start date');
    if (!dto.rules.length) throw new BadRequestException('Add a rule for at least one leave type');
    const seen = new Set<number>();
    for (const r of dto.rules) {
      if (seen.has(r.leaveTypeId)) throw new BadRequestException('A leave type can appear only once in a policy');
      seen.add(r.leaveTypeId);
      const problems = validateSlabs((r.slabs ?? []).map((s) => ({ fromMonths: s.fromMonths, toMonths: s.toMonths ?? null, annualDays: s.annualDays })));
      if (r.slabs?.length && problems.length) throw new BadRequestException(`Service slabs: ${problems[0]}`);
      if (r.proration === 'CUTOFF_DAY' && !r.cutoffDay) throw new BadRequestException('Give the cut-off day for that proration method');
      if (r.minDays != null && r.maxDays != null && r.minDays > r.maxDays) throw new BadRequestException('The minimum cannot be above the maximum');
    }
    const types = await this.prisma.leaveType.count({ where: { id: { in: [...seen] } } });
    if (types !== seen.size) throw new BadRequestException('One of the leave types does not exist');
    // Two policies of the same layer and scope must not cover the same leave type on the same dates.
    const others = await this.prisma.leavePolicy.findMany({
      where: {
        isActive: true,
        layer: dto.layer,
        id: selfId ? { not: selfId } : undefined,
        countryCode: dto.countryCode || null,
        branchId: dto.branchId ?? null,
        employeeTypeId: dto.employeeTypeId ?? null,
        employeeId: dto.employeeId ?? null,
        effectiveFrom: dto.effectiveTo ? { lte: d(dto.effectiveTo) } : undefined,
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: d(dto.effectiveFrom) } }] }],
        rules: { some: { leaveTypeId: { in: [...seen] } } },
      },
      select: { name: true },
    });
    if (others.length) throw new ConflictException(`"${others[0].name}" already covers the same people, leave type and dates. End it first, or start this one after it.`);
  }

  private data(dto: LeavePolicyDto) {
    return {
      name: dto.name.trim(), layer: dto.layer, countryCode: dto.countryCode || null, branchId: dto.branchId ?? null, employeeTypeId: dto.employeeTypeId ?? null, employeeId: dto.employeeId ?? null,
      effectiveFrom: d(dto.effectiveFrom), effectiveTo: dto.effectiveTo ? d(dto.effectiveTo) : null, priority: dto.priority, note: dto.note ?? null, isActive: dto.isActive ?? true,
    };
  }

  private rules(dto: LeavePolicyDto) {
    return dto.rules.map((r) => ({
      leaveTypeId: r.leaveTypeId, annualDays: r.annualDays, creditMethod: r.creditMethod,
      slabs: (r.slabs ?? []).map((s) => ({ fromMonths: s.fromMonths, toMonths: s.toMonths ?? null, annualDays: s.annualDays })) as unknown as Prisma.InputJsonValue,
      slabTiming: r.slabTiming, proration: r.proration, cutoffDay: r.cutoffDay ?? null, rounding: r.rounding, tieRule: r.tieRule, minDays: r.minDays ?? null, maxDays: r.maxDays ?? null,
    }));
  }

  async create(dto: LeavePolicyDto, user: CurrentUserPayload, ip?: string) {
    await this.check(dto);
    const row = await this.prisma.leavePolicy.create({ data: { ...this.data(dto), createdById: user.profileId, rules: { create: this.rules(dto) } } });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_POLICY_CREATED', entityType: 'LeavePolicy', entityId: String(row.id), ipAddress: ip });
    return (await this.list()).find((p) => p.id === row.id);
  }

  /**
   * A policy that has already produced entitlements keeps its rules: only the name, note, priority, end date and on/off
   * can change. To change a rule, end the policy and start a new one, so earlier figures can still be explained.
   */
  async update(id: number, dto: LeavePolicyDto, user: CurrentUserPayload, ip?: string) {
    const current = await this.prisma.leavePolicy.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('Policy not found');
    const used = (await this.prisma.leaveEntitlementRun.count({ where: { policyId: id } })) > 0;
    if (used) {
      if (dto.effectiveTo && dto.effectiveTo < iso(current.effectiveFrom)) throw new BadRequestException('The end date cannot be before the start date');
      await this.prisma.leavePolicy.update({ where: { id }, data: { name: dto.name.trim(), note: dto.note ?? null, priority: dto.priority, effectiveTo: dto.effectiveTo ? d(dto.effectiveTo) : null, isActive: dto.isActive ?? current.isActive } });
    } else {
      await this.check(dto, id);
      await this.prisma.$transaction([
        this.prisma.leavePolicyRule.deleteMany({ where: { policyId: id } }),
        this.prisma.leavePolicy.update({ where: { id }, data: { ...this.data(dto), rules: { create: this.rules(dto) } } }),
      ]);
    }
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_POLICY_UPDATED', entityType: 'LeavePolicy', entityId: String(id), ipAddress: ip, metadata: { rulesLocked: used } });
    return (await this.list()).find((p) => p.id === id);
  }

  async remove(id: number, user: CurrentUserPayload, ip?: string) {
    if ((await this.prisma.leaveEntitlementRun.count({ where: { policyId: id } })) > 0) throw new ConflictException('This policy has already been used. Switch it off instead of deleting it.');
    await this.prisma.leavePolicy.delete({ where: { id } });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_POLICY_DELETED', entityType: 'LeavePolicy', entityId: String(id), ipAddress: ip });
  }

  preview(employeeId: number, leaveTypeId: number, yearStart: string) {
    return this.entitlement.preview(employeeId, leaveTypeId, yearStart);
  }
}
