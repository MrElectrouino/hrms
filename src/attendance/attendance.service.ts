import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { RosterService } from '../attendance-setup/roster.service';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import {
  Actor,
  MANAGER_SETTABLE,
  instantFromLocal,
  canEdit,
  checkSelfMark,
  evaluateLate,
  hhmmToMinutes,
  localParts,
  nextPunchType,
  statusForMarkedDay,
  workedMinutesFromPunches,
} from './attendance-rules';
import { EditAttendanceDto, MarkAttendanceDto } from './dto/attendance.dto';
import { evaluateHours, flexibleLate, statusAfterHours, statusWhenHoursOk } from './hours-rules';
import { minutesBetween } from '../attendance-setup/attendance-logic';

const HR_TYPES: number[] = [UserType.SystemAdmin, UserType.HRAdmin];
const MAX_RANGE_DAYS = 62;

interface DayContext {
  employee: { id: number; profileId: number; reportingToId: number | null; branchId: number | null; shiftId: number | null; name: string };
  timeZone: string;
  country: string;
  policy: NonNullable<Awaited<ReturnType<AttendanceService['policyFor']>>>;
  settings: { moodEnabled: boolean; gpsRequirement: string; addressRequirement: string };
}

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly roster: RosterService,
  ) {}

  /* ------------------------------------------------------------------ context */

  private async employeeOfUser(user: CurrentUserPayload) {
    const e = await this.prisma.employee.findUnique({
      where: { profileId: user.profileId },
      select: { id: true, isActive: true },
    });
    if (!e || !e.isActive) throw new ForbiddenException('Your account is not linked to an active employee record');
    return e.id;
  }

  private async countryOf(employeeId: number): Promise<string> {
    const row = await this.prisma.employeeProfileSection.findUnique({ where: { employeeId_sectionKey: { employeeId, sectionKey: 'organization' } } });
    const c = (row?.data as { legalEntityCountry?: unknown } | null)?.legalEntityCountry;
    return typeof c === 'string' && c ? c : 'IN';
  }

  /** The most specific active policy: employee, then branch, then country. */
  async policyFor(employeeId: number, branchId: number | null, country: string, date: Date) {
    const rows = await this.prisma.attendancePolicyAssignment.findMany({
      where: {
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: date } }],
        AND: [{ OR: [{ scope: 'EMPLOYEE', employeeId }, ...(branchId ? [{ scope: 'BRANCH', branchId }] : []), { scope: 'COUNTRY', countryCode: country }] }],
        policy: { isActive: true },
      },
      include: { policy: true },
      orderBy: { effectiveFrom: 'desc' },
    });
    const rank = { EMPLOYEE: 0, BRANCH: 1, COUNTRY: 2 } as Record<string, number>;
    rows.sort((a, b) => rank[a.scope] - rank[b.scope]);
    return rows[0]?.policy ?? null;
  }

  private async timeZoneOf(branchId: number | null, country: string): Promise<string> {
    if (branchId) {
      const b = await this.prisma.branchTimezone.findUnique({ where: { branchId } });
      if (b) return b.timezone;
    }
    // The company timezone is the Default Timezone in System Settings > Regional settings.
    const setting = await this.prisma.systemConfiguration.findUnique({ where: { name: 'Default Timezone' }, select: { value: true } });
    if (setting?.value) return setting.value;
    const c = await this.prisma.country.findUnique({ where: { isoCode: country }, select: { defaultTimezone: true } });
    return c?.defaultTimezone || 'UTC';
  }

  async context(employeeId: number, date: Date): Promise<DayContext> {
    const e = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, profileId: true, reportingToId: true, branchId: true, shiftId: true, profile: { select: { name: true, lastName: true } } },
    });
    if (!e) throw new NotFoundException('Employee not found');
    const country = await this.countryOf(employeeId);
    const [timeZone, policy, settings] = await Promise.all([
      this.timeZoneOf(e.branchId, country),
      this.policyFor(employeeId, e.branchId, country, date),
      this.prisma.attendanceSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} }),
    ]);
    if (!policy) throw new BadRequestException(`No attendance policy applies to this employee (country ${country}). Ask an administrator to assign one.`);
    return { employee: { ...e, name: [e.profile.name, e.profile.lastName].filter(Boolean).join(' ') }, timeZone, country, policy, settings };
  }

  /** Shift of the day (roster first, then the employee's own shift), and what kind of day it is. */
  async dayInfo(employeeId: number, dateStr: string, fallbackShiftId: number | null) {
    const day = (await this.roster.resolveRange(employeeId, dateStr, dateStr)).days[0];
    const shiftId = day.roster.shift?.id ?? (day.roster.source === 'NONE' ? fallbackShiftId : null);
    const shift = shiftId ? await this.prisma.shift.findUnique({ where: { id: shiftId } }) : null;
    const schedule = day.workSchedule ? await this.prisma.workSchedule.findUnique({ where: { id: day.workSchedule.id } }) : null;
    return { day, shift, schedule };
  }

  private hhmm(t: Date | null | undefined): string | null {
    // Shift times are stored as time-of-day; Masters shows them in UTC, so read them the same way.
    return t ? t.toISOString().slice(11, 16) : null;
  }

  private async isRamadan(country: string, dateStr: string): Promise<boolean> {
    const d = parseIsoDate(dateStr)!;
    return !!(await this.prisma.ramadanPeriod.count({ where: { countryCode: country, startDate: { lte: d }, endDate: { gte: d } } }));
  }

  async lateOutcome(ctx: DayContext, dateStr: string, firstIn: Date, shift: { startTime: Date; altStartTime: Date | null; lateMinutes: number; halfDayMinutes: number } | null, schedule?: { scheduleType: string; latestStartTime: string | null } | null) {
    // Flexible hours have no fixed start: only a start window can make someone late.
    if (schedule?.scheduleType === 'FLEXIBLE') {
      const f = flexibleLate(localParts(firstIn, ctx.timeZone).minutes, schedule.latestStartTime);
      return { outcome: f.late ? ('LATE' as const) : ('ON_TIME' as const), lateBy: f.lateBy };
    }
    if (!shift) return { outcome: 'ON_TIME' as const, lateBy: 0 };
    const ramadan = ctx.policy.useRamadanShiftStart && shift.altStartTime && (await this.isRamadan(ctx.country, dateStr));
    const start = this.hhmm(ramadan ? shift.altStartTime : shift.startTime)!;
    return evaluateLate({
      inMinutes: localParts(firstIn, ctx.timeZone).minutes,
      startMinutes: hhmmToMinutes(start),
      lateMinutes: shift.lateMinutes,
      halfDayMinutes: shift.halfDayMinutes,
      lateEnabled: ctx.policy.lateEnabled,
      halfDayEnabled: ctx.policy.halfDayEnabled,
    });
  }

  /** Required time: the work schedule's requirement, else the shift's length. */
  requiredMinutes(schedule: { requiredDailyMinutes: number } | null, shift: { startTime: Date; endTime: Date } | null): number | null {
    if (schedule) return schedule.requiredDailyMinutes;
    if (!shift) return null;
    return minutesBetween(this.hhmm(shift.startTime)!, this.hhmm(shift.endTime)!);
  }

  statusFlags(code: string) {
    return this.prisma.attendanceStatus.findUnique({ where: { code } });
  }

  /* ------------------------------------------------------------------ employee: today and marking */

  async today(user: CurrentUserPayload, now: Date = new Date()) {
    const employeeId = await this.employeeOfUser(user);
    const probe = await this.prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { branchId: true } });
    const country = await this.countryOf(employeeId);
    const tz = await this.timeZoneOf(probe.branchId, country);
    const local = localParts(now, tz);
    const ctx = await this.context(employeeId, parseIsoDate(local.date)!);
    const record = await this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date: parseIsoDate(local.date)! } },
      include: { punches: { orderBy: { at: 'asc' } }, status: true },
    });
    const next = nextPunchType((record?.punches ?? []).map((p) => ({ punchType: p.punchType as 'IN' | 'OUT', at: p.at })));
    const allowed = next === 'OUT' ? { ok: true as const } : checkSelfMark(ctx.policy, local.date, local.date, local.minutes);
    const moods = ctx.settings.moodEnabled ? await this.prisma.parameter.findMany({ where: { isVisible: true, parameterType: { name: 'Mood' } }, orderBy: [{ displayOrder: 'asc' }], select: { text: true } }) : [];
    return {
      date: local.date,
      timeZone: tz,
      localTime: `${String(Math.floor(local.minutes / 60)).padStart(2, '0')}:${String(local.minutes % 60).padStart(2, '0')}`,
      next,
      canMark: allowed.ok,
      blockedReason: allowed.ok ? null : allowed.message,
      settings: { moodEnabled: ctx.settings.moodEnabled, gpsRequirement: ctx.settings.gpsRequirement, addressRequirement: ctx.settings.addressRequirement, moods: moods.map((m) => m.text) },
      record: record ? this.present(record) : null,
      punches: (record?.punches ?? []).map((p) => ({ type: p.punchType, at: p.at, source: p.source })),
    };
  }

  async mark(user: CurrentUserPayload, dto: MarkAttendanceDto, ip: string | undefined, now: Date = new Date()) {
    const employeeId = await this.employeeOfUser(user);
    const probe = await this.prisma.employee.findUniqueOrThrow({ where: { id: employeeId }, select: { branchId: true } });
    const country = await this.countryOf(employeeId);
    const tz = await this.timeZoneOf(probe.branchId, country);
    const local = localParts(now, tz);
    const forDate = dto.date ?? local.date;
    const date = parseIsoDate(forDate);
    if (!date) throw new BadRequestException('Date must be a real date (YYYY-MM-DD)');
    const isPast = forDate < local.date;
    const ctx = await this.context(employeeId, date);
    // A forgotten past day is stamped at the current clock time on that date (as the procedures do).
    const punchAt = isPast ? instantFromLocal(forDate, `${String(Math.floor(local.minutes / 60)).padStart(2, '0')}:${String(local.minutes % 60).padStart(2, '0')}`, tz) : now;

    const existing = await this.prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } }, include: { punches: true } });
    const punches = (existing?.punches ?? []).map((p) => ({ punchType: p.punchType as 'IN' | 'OUT', at: p.at }));
    const type = nextPunchType(punches);

    // The time limit stops a late first IN; ending the day (OUT) is always allowed.
    if (type === 'IN') {
      const ok = checkSelfMark(ctx.policy, forDate, local.date, local.minutes);
      if (!ok.ok) throw new ForbiddenException(ok.message);
    }
    if (existing && (await this.statusFlags(existing.statusCode))?.clearsPunches) throw new BadRequestException('This day is already recorded as leave or comp off');
    if (ctx.settings.gpsRequirement === 'REQUIRED' && !dto.coordinates) throw new BadRequestException('Your location is required to mark attendance');
    if (ctx.settings.addressRequirement === 'REQUIRED' && !dto.address) throw new BadRequestException('Your address is required to mark attendance');

    const { day, shift, schedule } = await this.dayInfo(employeeId, forDate, ctx.employee.shiftId);
    const isFirstIn = type === 'IN' && punches.length === 0;
    // Past-day marks skip the late rule unless the policy says to apply it.
    const late = isFirstIn && (!isPast || ctx.policy.applyLateRulesToPastDates) ? await this.lateOutcome(ctx, forDate, punchAt, shift, schedule) : isFirstIn ? { outcome: 'ON_TIME' as const, lateBy: 0 } : null;

    // When the day is ended, show the worked time the way the daily job will: break taken off, short hours and overtime.
    const required = day.holiday || day.roster.isWeeklyOff ? null : this.requiredMinutes(schedule, shift);
    const grossNow = workedMinutesFromPunches([...punches, { punchType: type, at: punchAt }]);
    const hoursNow = type === 'OUT' ? evaluateHours({ grossMinutes: grossNow, breakMinutes: schedule?.breakMinutes ?? 0, breakAfterMinutes: schedule?.breakAfterMinutes ?? 0, requiredMinutes: required, shortEnabled: ctx.policy.shortHoursEnabled, shortGraceMinutes: ctx.policy.shortHoursGraceMinutes, overtimeEnabled: ctx.policy.overtimeEnabled, overtimeAfterMinutes: ctx.policy.overtimeAfterMinutes }) : null;

    const saved = await this.prisma.$transaction(async (tx) => {
      const record =
        existing ??
        (await tx.attendance.create({
          data: { employeeId, date, shiftId: shift?.id ?? null, policyId: ctx.policy.id, policyVersion: ctx.policy.version, statusCode: 'NOT_APPROVED', isPresent: true, source: 'SELF', markedById: user.profileId, markedAt: now },
        }));
      await tx.attendancePunch.create({
        data: { attendanceId: record.id, punchType: type, at: punchAt, ip: ip ?? null, coordinates: dto.coordinates ?? null, address: dto.address ?? null, source: 'SELF' },
      });
      const all = [...punches, { punchType: type, at: punchAt }];
      const data: Prisma.AttendanceUncheckedUpdateInput = {
        lastOutAt: type === 'OUT' ? punchAt : record.lastOutAt,
        workedMinutes: hoursNow ? hoursNow.netMinutes : grossNow,
        requiredMinutes: required,
        shortMinutes: hoursNow?.shortMinutes ?? 0,
        overtimeMinutes: hoursNow?.overtimeMinutes ?? 0,
        isPresent: true,
        modifiedById: user.profileId,
        modifiedAt: now,
        // A person marking over a day the job filled in takes it over: it is no longer approved or automatic.
        ...(existing?.isAutoGenerated ? { isAutoGenerated: false, approvedAt: null, approvedById: null, source: 'SELF', leaveApplicationId: null, markedById: user.profileId, markedAt: now } : {}),
      };
      if (isFirstIn) {
        const onOff = day.holiday ? 'WORKED_ON_HOLIDAY' : day.roster.isWeeklyOff ? 'WORKED_ON_WEEKLY_OFF' : null;
        data.firstInAt = punchAt;
        data.inIp = ip ?? null;
        data.inCoordinates = dto.coordinates ?? null;
        data.inAddress = dto.address ?? null;
        data.lateMinutes = onOff ? 0 : late!.lateBy;
        data.statusCode = onOff ?? statusForMarkedDay({ outcome: late!.outcome, currentStatusSkipsLate: false, requiresApproval: ctx.policy.requiresApproval, approved: false });
      }
      if (type === 'OUT') {
        data.outIp = ip ?? null;
        data.outCoordinates = dto.coordinates ?? null;
        data.outAddress = dto.address ?? null;
      }
      const updated = await tx.attendance.update({ where: { id: record.id }, data });
      // One mood per day, taken when they press IN.
      if (type === 'IN' && ctx.settings.moodEnabled && dto.mood) {
        const valid = isPast ? 0 : await tx.parameter.count({ where: { text: dto.mood, isVisible: true, parameterType: { name: 'Mood' } } });
        if (valid) await tx.moodLog.upsert({ where: { employeeId_date: { employeeId, date } }, create: { employeeId, date, mood: dto.mood }, update: {} });
      }
      return updated;
    });

    await this.audit.log({ actorProfileId: user.profileId, action: type === 'IN' ? 'ATTENDANCE_IN' : 'ATTENDANCE_OUT', entityType: 'Attendance', entityId: String(saved.id), ipAddress: ip, metadata: { date: forDate, status: saved.statusCode } });
    return this.today(user, now);
  }

  /* ------------------------------------------------------------------ manager / HR */

  private async actorOf(user: CurrentUserPayload, employeeId: number): Promise<{ actor: Actor; isDirectReport: boolean }> {
    if (HR_TYPES.includes(user.userTypeId)) {
      if (user.branchAccess) {
        const e = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { branchId: true } });
        if (!e?.branchId || !user.branchAccess.includes(e.branchId)) throw new ForbiddenException('You do not have access to this employee\'s branch');
      }
      return { actor: 'HR', isDirectReport: false };
    }
    const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
    const target = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { reportingToId: true } });
    return { actor: me ? 'MANAGER' : 'EMPLOYEE', isDirectReport: !!me && target?.reportingToId === me.id };
  }

  /** Manager or HR corrects or approves a day. Approving stamps the approver and unlocks nothing further for managers. */
  async edit(user: CurrentUserPayload, employeeId: number, dateStr: string, dto: EditAttendanceDto, ip: string | undefined, opts: { force?: boolean } = {}) {
    const date = parseIsoDate(dateStr);
    if (!date) throw new BadRequestException('Date must be a real date (YYYY-MM-DD)');
    const { actor, isDirectReport } = await this.actorOf(user, employeeId);
    const ctx = await this.context(employeeId, date);

    const existing = await this.prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } }, include: { status: true } });
    // Approving a request the employee made (regularization) is an explicit decision, so a manager may apply it to an approved day.
    const rule = opts.force && actor === 'MANAGER' && isDirectReport ? { ok: true as const } : canEdit(actor, { exists: !!existing, approved: !!existing?.approvedAt }, { managerEditsOnlyUnapproved: ctx.policy.managerEditsOnlyUnapproved, isDirectReport });
    if (!rule.ok) throw new ForbiddenException(rule.message);

    const inAt = dto.inTime ? instantFromLocal(dateStr, dto.inTime, ctx.timeZone) : dto.inAt ? new Date(dto.inAt) : null;
    const outAt = dto.outTime ? instantFromLocal(dateStr, dto.outTime, ctx.timeZone) : dto.outAt ? new Date(dto.outAt) : null;
    if ((inAt && Number.isNaN(inAt.getTime())) || (outAt && Number.isNaN(outAt.getTime()))) throw new BadRequestException('IN and OUT must be valid date-times');
    if (inAt && outAt && outAt < inAt) throw new BadRequestException('OUT time cannot be before IN time');
    if (outAt && !inAt && !existing?.firstInAt) throw new BadRequestException('Add an IN time with the OUT time');
    for (const t of [inAt, outAt]) {
      if (t && localParts(t, ctx.timeZone).date !== dateStr) throw new BadRequestException(`Times must fall on ${dateStr} in ${ctx.timeZone}`);
    }

    let statusCode = dto.statusCode ?? null;
    if (statusCode) {
      const st = await this.statusFlags(statusCode);
      if (!st || !st.isActive) throw new BadRequestException('Unknown or inactive status');
      if (actor === 'MANAGER' && !(MANAGER_SETTABLE as readonly string[]).includes(statusCode)) throw new ForbiddenException('Managers can set Present, Absent or Not found present. HR can set any status.');
    }
    if (!existing && !inAt && !statusCode) throw new BadRequestException('Give an IN time or a status for a day with no record');

    const { day, shift, schedule } = await this.dayInfo(employeeId, dateStr, ctx.employee.shiftId);
    const finalIn = inAt ?? existing?.firstInAt ?? null;
    const finalOut = outAt ?? (inAt ? null : existing?.lastOutAt ?? null);
    const flags = statusCode ? await this.statusFlags(statusCode) : null;

    // Late / half day is re-evaluated from the corrected IN time, like the procedures do for an approver.
    let derived = existing?.statusCode ?? 'PRESENT';
    let lateMinutes = existing?.lateMinutes ?? 0;
    if (!statusCode && finalIn) {
      const onOff = day.holiday ? 'WORKED_ON_HOLIDAY' : day.roster.isWeeklyOff ? 'WORKED_ON_WEEKLY_OFF' : null;
      const skips = existing ? (await this.statusFlags(existing.statusCode))!.skipsLateRule : false;
      if (inAt || !existing) {
        const late = await this.lateOutcome(ctx, dateStr, finalIn, shift, schedule);
        lateMinutes = onOff ? 0 : late.lateBy;
        derived = onOff ?? statusForMarkedDay({ outcome: late.outcome, currentStatusSkipsLate: false, requiresApproval: false, approved: true });
      } else if (existing.statusCode === 'NOT_APPROVED' && !skips) {
        derived = 'PRESENT'; // approving an on-time day
      }
    }
    // Hours worked against the requirement (short hours, overtime) once both IN and OUT are known.
    const required = day.holiday || day.roster.isWeeklyOff ? null : this.requiredMinutes(schedule, shift);
    const sessionMinutes = finalIn && finalOut ? workedMinutesFromPunches([{ punchType: 'IN', at: finalIn }, { punchType: 'OUT', at: finalOut }]) : null;
    const hours = sessionMinutes === null ? null : evaluateHours({ grossMinutes: sessionMinutes, breakMinutes: schedule?.breakMinutes ?? 0, breakAfterMinutes: schedule?.breakAfterMinutes ?? 0, requiredMinutes: required, shortEnabled: ctx.policy.shortHoursEnabled, shortGraceMinutes: ctx.policy.shortHoursGraceMinutes, overtimeEnabled: ctx.policy.overtimeEnabled, overtimeAfterMinutes: ctx.policy.overtimeAfterMinutes });
    let hoursStatus = statusCode ?? derived;
    if (!statusCode && hours) {
      const skips = (await this.statusFlags(hoursStatus))?.skipsLateRule ?? false;
      hoursStatus = hours.isShort ? statusAfterHours(hoursStatus, true, skips) : statusWhenHoursOk(hoursStatus, false);
    }
    const finalStatus = hoursStatus;
    const clears = flags?.clearsPunches ?? false;

    const now = new Date();
    const profile = await this.prisma.profile.findUnique({ where: { id: user.profileId }, select: { name: true } });
    const remarks = [`Updated by ${profile?.name ?? 'user'} on ${now.toISOString().slice(0, 10).split('-').reverse().join('-')}`, dto.remarks?.trim()].filter(Boolean).join('. ');
    const source = actor === 'HR' ? 'HR' : 'MANAGER';

    const saved = await this.prisma.$transaction(async (tx) => {
      const base = { shiftId: shift?.id ?? null, policyId: ctx.policy.id, policyVersion: ctx.policy.version };
      const record = existing ?? (await tx.attendance.create({ data: { employeeId, date, ...base, statusCode: finalStatus, isPresent: false, source, markedById: user.profileId, markedAt: now } }));
      if (clears || inAt || outAt) {
        await tx.attendancePunch.deleteMany({ where: { attendanceId: record.id } });
        if (!clears && finalIn) await tx.attendancePunch.create({ data: { attendanceId: record.id, punchType: 'IN', at: finalIn, source } });
        if (!clears && finalOut) await tx.attendancePunch.create({ data: { attendanceId: record.id, punchType: 'OUT', at: finalOut, source } });
      }
      return tx.attendance.update({
        where: { id: record.id },
        data: {
          ...base,
          statusCode: finalStatus,
          isPresent: clears ? false : !!finalIn || (flags ? flags.category === 'WORK' : existing?.isPresent ?? false),
          firstInAt: clears ? null : finalIn,
          lastOutAt: clears ? null : finalOut,
          workedMinutes: clears || !hours ? null : hours.netMinutes,
          requiredMinutes: clears ? null : required,
          shortMinutes: clears || !hours ? 0 : hours.shortMinutes,
          overtimeMinutes: clears || !hours ? 0 : hours.overtimeMinutes,
          lateMinutes,
          source,
          approvedById: user.profileId,
          approvedAt: now,
          modifiedById: user.profileId,
          modifiedAt: now,
          remarks,
        },
      });
    });

    await this.audit.log({ actorProfileId: user.profileId, action: 'ATTENDANCE_EDITED', entityType: 'Attendance', entityId: String(saved.id), ipAddress: ip, metadata: { employeeId, date: dateStr, status: finalStatus, by: actor } });
    return this.present(await this.prisma.attendance.findUniqueOrThrow({ where: { id: saved.id }, include: { status: true } }));
  }

  /* ------------------------------------------------------------------ reading */

  private present(r: { id: bigint; employeeId: number; date: Date; statusCode: string; status: { name: string; color: string }; isPresent: boolean; firstInAt: Date | null; lastOutAt: Date | null; lateMinutes: number; workedMinutes: number | null; approvedAt: Date | null; source: string; remarks: string | null }) {
    return {
      id: r.id.toString(),
      employeeId: r.employeeId,
      date: toIsoDate(r.date),
      statusCode: r.statusCode,
      statusName: r.status.name,
      statusColor: r.status.color,
      isPresent: r.isPresent,
      firstInAt: r.firstInAt,
      lastOutAt: r.lastOutAt,
      lateMinutes: r.lateMinutes,
      workedMinutes: r.workedMinutes,
      approved: !!r.approvedAt,
      source: r.source,
      remarks: r.remarks,
    };
  }

  /** scope "me" = own days; "team" = days of the people you manage (HR: everyone in their branches). */
  async list(user: CurrentUserPayload, scope: 'me' | 'team', fromStr: string, toStr: string, employeeId?: number) {
    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);
    if (!from || !to || to < from) throw new BadRequestException('Give a valid from and to date');
    if ((to.getTime() - from.getTime()) / 86_400_000 + 1 > MAX_RANGE_DAYS) throw new BadRequestException(`Ask for at most ${MAX_RANGE_DAYS} days at a time`);

    let where: Prisma.AttendanceWhereInput = { date: { gte: from, lte: to } };
    if (scope === 'me') {
      where = { ...where, employeeId: await this.employeeOfUser(user) };
    } else if (HR_TYPES.includes(user.userTypeId)) {
      where = { ...where, ...(employeeId ? { employeeId } : {}), ...(user.activeBranchIds ? { employee: { branchId: { in: user.activeBranchIds } } } : {}) };
    } else {
      const me = await this.employeeOfUser(user);
      where = { ...where, employee: { reportingToId: me }, ...(employeeId ? { employeeId } : {}) };
    }
    const rows = await this.prisma.attendance.findMany({
      where,
      orderBy: [{ date: 'desc' }, { employeeId: 'asc' }],
      take: 500,
      include: { status: true, employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } },
    });
    const zones = await this.timeZones([...new Set(rows.map((r) => r.employeeId))]);
    const hm = (d: Date | null, tz: string) => {
      if (!d) return null;
      const m = localParts(d, tz).minutes;
      return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
    };
    return rows.map((r) => {
      const tz = zones.get(r.employeeId) ?? 'UTC';
      return {
        ...this.present(r),
        timeZone: tz,
        inLocal: hm(r.firstInAt, tz),
        outLocal: hm(r.lastOutAt, tz),
        employeeCode: r.employee.employeeCode,
        employeeName: [r.employee.profile.name, r.employee.profile.lastName].filter(Boolean).join(' '),
      };
    });
  }

  /** Timezone of each employee (branch override, then country default), for showing local times. */
  private async timeZones(employeeIds: number[]): Promise<Map<number, string>> {
    const map = new Map<number, string>();
    if (!employeeIds.length) return map;
    const [emps, sections, branchTz, countries, companyTz] = await Promise.all([
      this.prisma.employee.findMany({ where: { id: { in: employeeIds } }, select: { id: true, branchId: true } }),
      this.prisma.employeeProfileSection.findMany({ where: { employeeId: { in: employeeIds }, sectionKey: 'organization' }, select: { employeeId: true, data: true } }),
      this.prisma.branchTimezone.findMany(),
      this.prisma.country.findMany({ select: { isoCode: true, defaultTimezone: true } }),
      this.prisma.systemConfiguration.findUnique({ where: { name: 'Default Timezone' }, select: { value: true } }),
    ]);
    for (const e of emps) {
      const country = (sections.find((s) => s.employeeId === e.id)?.data as { legalEntityCountry?: string } | null)?.legalEntityCountry ?? 'IN';
      map.set(e.id, branchTz.find((b) => b.branchId === e.branchId)?.timezone ?? companyTz?.value ?? countries.find((c) => c.isoCode === country)?.defaultTimezone ?? 'UTC');
    }
    return map;
  }

  statuses() {
    return this.prisma.attendanceStatus.findMany({ where: { isActive: true }, orderBy: { sortOrder: 'asc' } });
  }

  /** Used by tests and the daily job: is this a duplicate-safe way to know a policy exists. */
  async assertNoDuplicate(employeeId: number, date: Date) {
    if (await this.prisma.attendance.count({ where: { employeeId, date } })) throw new ConflictException('Attendance already exists for that day');
  }
}
