import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import { AttendanceService } from './attendance.service';
import { workedMinutesFromPunches } from './attendance-rules';
import { evaluateHours, expectation, statusAfterHours, statusForUnmarkedDay, statusWhenHoursOk } from './hours-rules';

const DAY_MS = 86_400_000;
const MAX_RANGE_DAYS = 31;

export type DayOutcome = 'CREATED' | 'UPDATED' | 'SKIPPED';

/**
 * Builds the day for everyone: holidays, weekly offs, approved leave and absences for days nobody marked,
 * and the hours, short hours and overtime for days that have punches. Safe to run again: it never
 * overwrites a day a person has approved or corrected.
 */
@Injectable()
export class AttendanceProcessingService {
  private readonly logger = new Logger(AttendanceProcessingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly attendance: AttendanceService,
  ) {}

  /** Every night: the last two finished days, so each timezone's day is complete. */
  @Cron('0 2 * * *')
  async nightly() {
    const todayUtc = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    const to = toIsoDate(new Date(todayUtc.getTime() - DAY_MS));
    const from = toIsoDate(new Date(todayUtc.getTime() - 2 * DAY_MS));
    try {
      await this.run(null, from, to, 'CRON');
    } catch (e) {
      this.logger.error(`Nightly attendance processing failed: ${(e as Error).message}`);
    }
  }

  async run(user: CurrentUserPayload | null, fromStr: string, toStr: string, trigger: 'CRON' | 'MANUAL') {
    if (user && ![UserType.SystemAdmin, UserType.HRAdmin].includes(user.userTypeId)) throw new ForbiddenException('Only HR or System Admin can run attendance processing');
    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);
    if (!from || !to || to < from) throw new BadRequestException('Give a valid from and to date');
    const span = Math.round((to.getTime() - from.getTime()) / DAY_MS) + 1;
    if (span > MAX_RANGE_DAYS) throw new BadRequestException(`Process at most ${MAX_RANGE_DAYS} days at a time`);
    const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
    if (to >= today) throw new BadRequestException('Only finished days can be processed. The last day allowed is yesterday.');

    const run = await this.prisma.attendanceProcessingRun.create({ data: { fromDate: from, toDate: to, trigger, createdById: user?.profileId ?? null } });
    const counts = { CREATED: 0, UPDATED: 0, SKIPPED: 0 };
    const errors: { employeeId: number; date: string; message: string }[] = [];
    const employees = await this.prisma.employee.findMany({ where: { isActive: true, dateOfJoining: { lte: to } }, select: { id: true, dateOfJoining: true } });

    for (const e of employees) {
      for (let i = 0; i < span; i++) {
        const d = new Date(from.getTime() + i * DAY_MS);
        if (d < e.dateOfJoining) continue;
        try {
          counts[await this.processDay(e.id, toIsoDate(d))]++;
        } catch (err) {
          errors.push({ employeeId: e.id, date: toIsoDate(d), message: (err as Error).message });
          counts.SKIPPED++;
        }
      }
    }
    const done = await this.prisma.attendanceProcessingRun.update({
      where: { id: run.id },
      data: { createdDays: counts.CREATED, updatedDays: counts.UPDATED, skippedDays: counts.SKIPPED, errors: errors.slice(0, 200) as unknown as Prisma.InputJsonValue, finishedAt: new Date() },
    });
    if (user) await this.audit.log({ actorProfileId: user.profileId, action: 'ATTENDANCE_PROCESSED', entityType: 'AttendanceProcessingRun', entityId: String(run.id), metadata: { from: fromStr, to: toStr, ...counts } });
    return { ...done, errors: errors.slice(0, 50) };
  }

  runs() {
    return this.prisma.attendanceProcessingRun.findMany({ orderBy: { startedAt: 'desc' }, take: 20 });
  }

  /** One employee, one finished day. */
  async processDay(employeeId: number, dateStr: string): Promise<DayOutcome> {
    const date = parseIsoDate(dateStr)!;
    const ctx = await this.attendance.context(employeeId, date);
    const existing = await this.prisma.attendance.findUnique({ where: { employeeId_date: { employeeId, date } }, include: { punches: { orderBy: { at: 'asc' } } } });
    const { day, shift, schedule } = await this.attendance.dayInfo(employeeId, dateStr, ctx.employee.shiftId);

    // Days with punches: work out the hours.
    if (existing?.firstInAt) {
      if (!existing.lastOutAt) return 'SKIPPED'; // forgot to press OUT: shows in the missing punch report
      const gross = workedMinutesFromPunches(existing.punches.map((p) => ({ punchType: p.punchType as 'IN' | 'OUT', at: p.at })));
      const required = day.holiday || day.roster.isWeeklyOff ? null : this.attendance.requiredMinutes(schedule, shift);
      const h = evaluateHours({ grossMinutes: gross, breakMinutes: schedule?.breakMinutes ?? 0, breakAfterMinutes: schedule?.breakAfterMinutes ?? 0, requiredMinutes: required, shortEnabled: ctx.policy.shortHoursEnabled, shortGraceMinutes: ctx.policy.shortHoursGraceMinutes, overtimeEnabled: ctx.policy.overtimeEnabled, overtimeAfterMinutes: ctx.policy.overtimeAfterMinutes });
      let status = existing.statusCode;
      // A day someone has approved keeps its status; only the numbers are refreshed.
      if (!existing.approvedAt) {
        const skips = (await this.attendance.statusFlags(status))?.skipsLateRule ?? false;
        status = h.isShort ? statusAfterHours(status, true, skips) : statusWhenHoursOk(status, ctx.policy.requiresApproval);
      }
      const same = existing.workedMinutes === h.netMinutes && existing.requiredMinutes === required && existing.shortMinutes === h.shortMinutes && existing.overtimeMinutes === h.overtimeMinutes && existing.statusCode === status;
      if (same) return 'SKIPPED';
      await this.prisma.attendance.update({ where: { id: existing.id }, data: { workedMinutes: h.netMinutes, requiredMinutes: required, shortMinutes: h.shortMinutes, overtimeMinutes: h.overtimeMinutes, statusCode: status, policyId: ctx.policy.id, policyVersion: ctx.policy.version, modifiedAt: new Date() } });
      return 'UPDATED';
    }

    // Days with no punches: holiday, weekly off, leave or absent.
    // Leave can cover days outside its dates (a weekend counted by the sandwich rule), so look at what each application counted.
    const near = await this.prisma.leaveApplication.findMany({
      where: { employeeId, status: 'APPROVED', fromDate: { lte: new Date(date.getTime() + 8 * DAY_MS) }, toDate: { gte: new Date(date.getTime() - 8 * DAY_MS) } },
    });
    const leave = near.find((a) => (a.calculation as { date: string; reason: string }[]).some((d) => d.date === dateStr && d.reason !== 'OFF_NOT_COUNTED'));
    const onLeave = !!leave;
    const status = statusForUnmarkedDay(expectation({ isHoliday: !!day.holiday, rosterSource: day.roster.source, isWeeklyOff: day.roster.isWeeklyOff }), onLeave);
    if (!status) return 'SKIPPED';

    // An existing record with no punches is only replaced if the system made it and nobody has touched it.
    if (existing) {
      if (!existing.isAutoGenerated || existing.approvedById || existing.statusCode === status) return 'SKIPPED';
    }
    // An absence waits for review only when the policy asks for approval.
    const needsReview = status === 'ABSENT' && ctx.policy.requiresApproval;
    const data = {
      shiftId: shift?.id ?? null,
      policyId: ctx.policy.id,
      policyVersion: ctx.policy.version,
      statusCode: status,
      isPresent: false,
      isAutoGenerated: true,
      source: 'SYSTEM',
      leaveApplicationId: onLeave ? leave!.id : null,
      requiredMinutes: this.attendance.requiredMinutes(schedule, shift),
      approvedAt: needsReview ? null : new Date(),
      modifiedAt: new Date(),
    };
    if (existing) await this.prisma.attendance.update({ where: { id: existing.id }, data });
    else await this.prisma.attendance.create({ data: { employeeId, date, ...data } });
    return existing ? 'UPDATED' : 'CREATED';
  }
}
