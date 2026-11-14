import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { isValidTimeZone } from '../attendance/attendance-rules';
import { BranchDto } from './dto/branch.dto';

const blank = (v?: string | null) => (v && v.trim() ? v.trim() : null);

/** The places the company works from: name, country, timezone and contact details. */
@Injectable()
export class BranchesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private async activeBranches(onlyIds: number[] | null) {
    const rows = await this.prisma.branch.findMany({
      where: { isActive: true, ...(onlyIds ? { id: { in: onlyIds } } : {}) },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: { id: true, code: true, name: true, countryCode: true, timezone: true },
    });
    return rows;
  }

  /** Branches the signed-in account can work in (for the header switcher). */
  async mine(user: CurrentUserPayload) {
    return { restricted: user.branchAccess !== null, branches: await this.activeBranches(user.branchAccess) };
  }

  /** Every active branch, for assigning branch access to an account. */
  async all() {
    return this.activeBranches(null);
  }

  /** Everything for the Branches screen: all branches (also switched-off ones), how many people use each, and the country list. */
  async manage() {
    const [rows, countries, employees] = await Promise.all([
      this.prisma.branch.findMany({ orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }] }),
      this.prisma.country.findMany({ where: { isActive: true }, orderBy: { name: 'asc' }, select: { isoCode: true, name: true, defaultTimezone: true } }),
      this.prisma.employee.groupBy({ by: ['branchId'], _count: { _all: true }, where: { isActive: true, branchId: { not: null } } }),
    ]);
    const count = new Map(employees.map((e) => [e.branchId, e._count._all]));
    return {
      countries,
      branches: rows.map((b) => ({ ...b, createdAt: undefined, updatedAt: undefined, employeeCount: count.get(b.id) ?? 0 })),
    };
  }

  private async check(dto: BranchDto, selfId?: number) {
    const code = dto.code.trim().toUpperCase();
    const name = dto.name.trim();
    if (await this.prisma.branch.findFirst({ where: { code, id: selfId ? { not: selfId } : undefined }, select: { id: true } })) throw new ConflictException(`The code "${code}" is already used by another branch`);
    if (await this.prisma.branch.findFirst({ where: { name, id: selfId ? { not: selfId } : undefined }, select: { id: true } })) throw new ConflictException(`A branch named "${name}" already exists`);
    const countryCode = blank(dto.countryCode)?.toUpperCase() ?? null;
    if (countryCode && !(await this.prisma.country.findFirst({ where: { isoCode: countryCode, isActive: true }, select: { id: true } }))) {
      throw new BadRequestException('Choose a country from the country list (System settings > Countries)');
    }
    const timezone = blank(dto.timezone);
    if (timezone && !isValidTimeZone(timezone)) throw new BadRequestException(`"${timezone}" is not a valid timezone (for example Asia/Dubai)`);
    return { code, name, countryCode, timezone };
  }

  private data(dto: BranchDto, c: { code: string; name: string; countryCode: string | null; timezone: string | null }) {
    return { code: c.code, name: c.name, countryCode: c.countryCode, timezone: c.timezone, address: blank(dto.address), city: blank(dto.city), phone: blank(dto.phone), email: blank(dto.email), isActive: dto.isActive ?? true, sortOrder: dto.sortOrder ?? 0 };
  }

  async create(dto: BranchDto, user: CurrentUserPayload, ip?: string) {
    const c = await this.check(dto);
    const created = await this.prisma.branch.create({ data: this.data(dto, c) });
    await this.audit.log({ actorProfileId: user.profileId, action: 'BRANCH_CREATED', entityType: 'Branch', entityId: String(created.id), ipAddress: ip });
    return created;
  }

  async update(id: number, dto: BranchDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.branch.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Branch not found');
    const c = await this.check(dto, id);
    const updated = await this.prisma.branch.update({ where: { id }, data: this.data(dto, c) });
    await this.audit.log({ actorProfileId: user.profileId, action: 'BRANCH_UPDATED', entityType: 'Branch', entityId: String(id), ipAddress: ip });
    return updated;
  }

  /** A branch still in use (employees, accounts, calendars, policies) can only be switched off. */
  async remove(id: number, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.branch.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Branch not found');
    const [employees, users, calendars, assignments] = await Promise.all([
      this.prisma.employee.count({ where: { branchId: id } }),
      this.prisma.userBranch.count({ where: { branchId: id } }),
      this.prisma.holidayCalendar.count({ where: { branchId: id } }),
      this.prisma.attendancePolicyAssignment.count({ where: { branchId: id } }),
    ]);
    if (employees + users + calendars + assignments > 0) {
      throw new ConflictException('This branch is in use (employees, accounts, holiday calendars or policies). Switch it off instead of deleting it.');
    }
    await this.prisma.branch.delete({ where: { id } });
    await this.audit.log({ actorProfileId: user.profileId, action: 'BRANCH_DELETED', entityType: 'Branch', entityId: String(id), ipAddress: ip });
  }
}
