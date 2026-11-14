import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import { isValidTimeZone } from './attendance-rules';
import { AssignmentDto, PolicyDto, RamadanDto, SettingsDto, StatusDto } from './dto/config.dto';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** System Settings > Attendance configuration: values, never logic. */
@Injectable()
export class AttendanceConfigService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private log(user: CurrentUserPayload, action: string, id: string | number, ip?: string) {
    return this.audit.log({ actorProfileId: user.profileId, action, entityType: 'AttendanceConfig', entityId: String(id), ipAddress: ip });
  }

  async overview() {
    const [statuses, policies, ramadan, settings, branches, branchTz, countries] = await Promise.all([
      this.prisma.attendanceStatus.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.attendancePolicy.findMany({ orderBy: { name: 'asc' }, include: { assignments: { orderBy: [{ scope: 'asc' }, { effectiveFrom: 'desc' }], include: { branch: { select: { text: true } }, employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } } } } }),
      this.prisma.ramadanPeriod.findMany({ orderBy: [{ countryCode: 'asc' }, { startDate: 'desc' }] }),
      this.prisma.attendanceSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
      this.prisma.parameter.findMany({ where: { isVisible: true, parameterType: { name: 'Branch' } }, orderBy: { text: 'asc' }, select: { id: true, text: true } }),
      this.prisma.branchTimezone.findMany(),
      this.prisma.country.findMany({ where: { isActive: true }, select: { isoCode: true, name: true, defaultTimezone: true } }),
    ]);
    const f = (d: Date | null) => (d ? toIsoDate(d) : null);
    return {
      statuses,
      settings,
      countries,
      branches: branches.map((b) => ({ id: b.id, name: b.text, timezone: branchTz.find((t) => t.branchId === b.id)?.timezone ?? null })),
      ramadan: ramadan.map((r) => ({ id: r.id, countryCode: r.countryCode, startDate: toIsoDate(r.startDate), endDate: toIsoDate(r.endDate) })),
      policies: policies.map((p) => ({
        ...p,
        assignments: p.assignments.map((a) => ({
          id: a.id,
          scope: a.scope,
          countryCode: a.countryCode,
          branchId: a.branchId,
          branchName: a.branch?.text ?? null,
          employeeId: a.employeeId,
          employeeName: a.employee ? `${a.employee.profile.name} ${a.employee.profile.lastName ?? ''} (${a.employee.employeeCode})`.trim() : null,
          effectiveFrom: f(a.effectiveFrom),
          effectiveTo: f(a.effectiveTo),
        })),
      })),
    };
  }

  async savePolicy(id: number | null, dto: PolicyDto, user: CurrentUserPayload, ip?: string) {
    if (dto.selfMarkCutoffTime && !HHMM.test(dto.selfMarkCutoffTime)) throw new BadRequestException('Cutoff time must be HH:mm');
    const data = {
      name: dto.name.trim(),
      isActive: dto.isActive ?? true,
      lateEnabled: dto.lateEnabled,
      halfDayEnabled: dto.halfDayEnabled,
      allowPastDateSelfMarking: dto.allowPastDateSelfMarking,
      applyLateRulesToPastDates: dto.applyLateRulesToPastDates,
      selfMarkCutoffTime: dto.selfMarkCutoffTime || null,
      cutoffExemptHr: dto.cutoffExemptHr,
      managerEditsOnlyUnapproved: dto.managerEditsOnlyUnapproved,
      requiresApproval: dto.requiresApproval,
      useRamadanShiftStart: dto.useRamadanShiftStart,
      shortHoursEnabled: dto.shortHoursEnabled,
      shortHoursGraceMinutes: Math.max(0, dto.shortHoursGraceMinutes),
      overtimeEnabled: dto.overtimeEnabled,
      overtimeAfterMinutes: Math.max(0, dto.overtimeAfterMinutes),
    };
    if (id === null) {
      if (!dto.code) throw new BadRequestException('A policy needs a code');
      const created = await this.prisma.attendancePolicy.create({ data: { code: dto.code.trim().toUpperCase(), ...data } });
      await this.log(user, 'ATTENDANCE_POLICY_CREATED', created.id, ip);
      return created;
    }
    if (!(await this.prisma.attendancePolicy.findUnique({ where: { id } }))) throw new NotFoundException('Policy not found');
    // Every change bumps the version, which is stored on each day processed under it.
    const updated = await this.prisma.attendancePolicy.update({ where: { id }, data: { ...data, version: { increment: 1 } } });
    await this.log(user, 'ATTENDANCE_POLICY_UPDATED', id, ip);
    return updated;
  }

  async addAssignment(policyId: number, dto: AssignmentDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.attendancePolicy.findUnique({ where: { id: policyId } }))) throw new NotFoundException('Policy not found');
    const from = parseIsoDate(dto.effectiveFrom);
    const to = dto.effectiveTo ? parseIsoDate(dto.effectiveTo) : null;
    if (!from || (dto.effectiveTo && !to) || (to && to < from)) throw new BadRequestException('Dates must be real dates, and "to" cannot be before "from"');
    if (dto.scope === 'COUNTRY' && !dto.countryCode) throw new BadRequestException('Choose a country');
    if (dto.scope === 'BRANCH' && !dto.branchId) throw new BadRequestException('Choose a branch');
    if (dto.scope === 'EMPLOYEE' && !dto.employeeId) throw new BadRequestException('Choose an employee');
    const where = { scope: dto.scope, countryCode: dto.scope === 'COUNTRY' ? dto.countryCode! : null, branchId: dto.scope === 'BRANCH' ? dto.branchId! : null, employeeId: dto.scope === 'EMPLOYEE' ? dto.employeeId! : null };
    // Two assignments at the same level must not cover the same dates.
    const clash = await this.prisma.attendancePolicyAssignment.findFirst({
      where: { ...where, effectiveFrom: to ? { lte: to } : undefined, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
    });
    if (clash) throw new BadRequestException('Another policy already applies to this country, branch or employee in those dates. End it first.');
    const created = await this.prisma.attendancePolicyAssignment.create({ data: { policyId, ...where, effectiveFrom: from, effectiveTo: to } });
    await this.log(user, 'ATTENDANCE_POLICY_ASSIGNED', created.id, ip);
    return created;
  }

  async removeAssignment(id: number, user: CurrentUserPayload, ip?: string) {
    const res = await this.prisma.attendancePolicyAssignment.deleteMany({ where: { id } });
    if (!res.count) throw new NotFoundException('Assignment not found');
    await this.log(user, 'ATTENDANCE_POLICY_UNASSIGNED', id, ip);
  }

  async addRamadan(dto: RamadanDto, user: CurrentUserPayload, ip?: string) {
    const start = parseIsoDate(dto.startDate);
    const end = parseIsoDate(dto.endDate);
    if (!start || !end || end < start) throw new BadRequestException('Dates must be real dates, and the end cannot be before the start');
    const created = await this.prisma.ramadanPeriod.create({ data: { countryCode: dto.countryCode.toUpperCase(), startDate: start, endDate: end } });
    await this.log(user, 'RAMADAN_PERIOD_ADDED', created.id, ip);
    return created;
  }

  async removeRamadan(id: number, user: CurrentUserPayload, ip?: string) {
    const res = await this.prisma.ramadanPeriod.deleteMany({ where: { id } });
    if (!res.count) throw new NotFoundException('Period not found');
    await this.log(user, 'RAMADAN_PERIOD_REMOVED', id, ip);
  }

  /** null or empty removes the override, so the branch uses its country's timezone. */
  async setBranchTimezone(branchId: number, timezone: string | null, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.parameter.count({ where: { id: branchId, parameterType: { name: 'Branch' } } }))) throw new NotFoundException('Branch not found');
    if (!timezone) await this.prisma.branchTimezone.deleteMany({ where: { branchId } });
    else {
      if (!isValidTimeZone(timezone)) throw new BadRequestException(`"${timezone}" is not a valid timezone (for example Asia/Dubai)`);
      await this.prisma.branchTimezone.upsert({ where: { branchId }, create: { branchId, timezone }, update: { timezone } });
    }
    await this.log(user, 'BRANCH_TIMEZONE_SET', branchId, ip);
  }

  async saveSettings(dto: SettingsDto, user: CurrentUserPayload, ip?: string) {
    const saved = await this.prisma.attendanceSettings.upsert({ where: { id: 1 }, create: { id: 1, ...dto }, update: dto });
    await this.log(user, 'ATTENDANCE_SETTINGS_UPDATED', 1, ip);
    return saved;
  }

  /** Names, colours and on/off only: what a status does is fixed in the application. */
  async saveStatus(code: string, dto: StatusDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.attendanceStatus.findUnique({ where: { code } }))) throw new NotFoundException('Status not found');
    const updated = await this.prisma.attendanceStatus.update({ where: { code }, data: dto });
    await this.log(user, 'ATTENDANCE_STATUS_UPDATED', code, ip);
    return updated;
  }
}
