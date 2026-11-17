import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AttendanceSetupService } from './attendance-setup.service';
import {
  HolidayLevel,
  cycleIndex,
  daysBetween,
  parseIsoDate,
  pickGroupAssignment,
  pickHolidayCalendar,
  toIsoDate,
  validateRosterRows,
} from './attendance-logic';
import { RosterEntryDto } from './dto/attendance.dto';
import { IMPORT_MAX_BYTES, buildTemplate, readSheet } from './excel.util';
import { WeeklyOffRule, isWeeklyOffDay } from './weekly-off.util';

const MAX_RANGE_DAYS = 62;

const covers = (a: { effectiveFrom: Date; effectiveTo: Date | null }, d: Date) => a.effectiveFrom <= d && (a.effectiveTo === null || a.effectiveTo >= d);

@Injectable()
export class RosterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly setup: AttendanceSetupService,
  ) {}

  private async countryOf(employeeId: number): Promise<string> {
    const row = await this.prisma.employeeProfileSection.findUnique({ where: { employeeId_sectionKey: { employeeId, sectionKey: 'organization' } } });
    const c = (row?.data as { legalEntityCountry?: unknown } | null)?.legalEntityCountry;
    return typeof c === 'string' && c ? c : 'IN';
  }

  /**
   * What an employee's days look like: holiday (from the first calendar in the configured order),
   * roster (a single-day entry beats the pattern), and work schedule.
   */
  async resolveRange(employeeId: number, fromStr: string, toStr: string) {
    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);
    if (!from || !to) throw new BadRequestException('from and to must be dates (YYYY-MM-DD)');
    const span = daysBetween(from, to);
    if (span < 0) throw new BadRequestException('"to" cannot be before "from"');
    if (span + 1 > MAX_RANGE_DAYS) throw new BadRequestException(`Ask for at most ${MAX_RANGE_DAYS} days at a time`);

    const employee = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, branchId: true, siteId: true } });
    if (!employee) throw new NotFoundException('Employee not found');

    const overlap = { employeeId, effectiveFrom: { lte: to }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] };
    const country = await this.countryOf(employeeId);
    const [order, schedules, patterns, entries, empCalendars, candidateCalendars, weeklyOffs, groupRows] = await Promise.all([
      this.setup.getHolidayOrder(),
      this.prisma.employeeWorkSchedule.findMany({ where: overlap, include: { workSchedule: true } }),
      this.prisma.employeeRosterPattern.findMany({ where: overlap, include: { pattern: { include: { days: { include: { shift: { select: { id: true, name: true } } } } } } } }),
      this.prisma.rosterEntry.findMany({ where: { employeeId, date: { gte: from, lte: to } }, include: { shift: { select: { id: true, name: true } } } }),
      this.prisma.employeeHolidayCalendar.findMany({ where: overlap }),
      this.prisma.holidayCalendar.findMany({
        where: {
          isActive: true,
          OR: [{ scope: 'COMPANY' }, { scope: 'COUNTRY', countryCode: country }, ...(employee.branchId ? [{ scope: 'BRANCH', branchId: employee.branchId }] : []), ...(employee.siteId ? [{ scope: 'SITE', siteId: employee.siteId }] : [])],
        },
        orderBy: { id: 'asc' },
      }),
      this.prisma.employeeWeeklyOff.findMany({ where: overlap, include: { template: { select: { days: true, rules: true } } } }),
      // What the branch, country or company gave everyone; an assignment made to the employee wins over these.
      this.prisma.attendanceGroupAssignment.findMany({
        where: {
          effectiveFrom: { lte: to },
          AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] }],
          OR: [{ scope: 'COMPANY' }, { scope: 'COUNTRY', countryCode: country }, ...(employee.branchId ? [{ scope: 'BRANCH', branchId: employee.branchId }] : []), ...(employee.siteId ? [{ scope: 'SITE', siteId: employee.siteId }] : [])],
        },
      }),
    ]);
    const who = { branchId: employee.branchId, siteId: employee.siteId, country };
    const groupOf = (kind: string) => groupRows.filter((g) => g.kind === kind);
    const groupSchedules = groupOf('WORK_SCHEDULE');
    const groupTemplates = groupOf('WEEKLY_OFF');
    const groupPatterns = groupOf('ROSTER_PATTERN');
    const [gSchedules, gTemplates, gPatterns] = await Promise.all([
      this.prisma.workSchedule.findMany({ where: { id: { in: groupSchedules.map((g) => g.refId) } } }),
      this.prisma.weeklyOffTemplate.findMany({ where: { id: { in: groupTemplates.map((g) => g.refId) } }, select: { id: true, days: true, rules: true } }),
      this.prisma.rosterPattern.findMany({ where: { id: { in: groupPatterns.map((g) => g.refId) } }, include: { days: { include: { shift: { select: { id: true, name: true } } } } } }),
    ]);

    const levelCalendar = (scope: string) => candidateCalendars.find((c) => c.scope === scope)?.id ?? null;
    const calendarIds = new Set<number>([...candidateCalendars.map((c) => c.id), ...empCalendars.map((c) => c.calendarId)]);
    const holidays = calendarIds.size
      ? await this.prisma.holiday.findMany({
          where: { calendarId: { in: [...calendarIds] }, date: { lte: to }, OR: [{ endDate: null, date: { gte: from } }, { endDate: { gte: from } }] },
        })
      : [];
    // A holiday of several days is looked up under each of its days that falls in the range.
    const holidayAt = new Map<string, (typeof holidays)[number]>();
    for (const h of holidays) {
      const first = h.date > from ? h.date : from;
      const finish = h.endDate && h.endDate < to ? h.endDate : h.endDate ? to : h.date;
      for (let t = first.getTime(); t <= finish.getTime(); t += 86_400_000) holidayAt.set(`${h.calendarId}|${toIsoDate(new Date(t))}`, h);
    }
    const entryAt = new Map(entries.map((e) => [toIsoDate(e.date), e]));

    const days = [];
    for (let i = 0; i <= span; i++) {
      const date = new Date(from.getTime() + i * 86_400_000);
      const iso = toIsoDate(date);

      const emp = empCalendars.find((a) => covers(a, date));
      const byLevel: Partial<Record<HolidayLevel, number | null>> = {
        EMPLOYEE: emp?.calendarId ?? null,
        SITE: levelCalendar('SITE'),
        BRANCH: levelCalendar('BRANCH'),
        COUNTRY: levelCalendar('COUNTRY'),
        COMPANY: levelCalendar('COMPANY'),
      };
      const picked = pickHolidayCalendar(order, byLevel);
      const holiday = picked ? holidayAt.get(`${picked.calendarId}|${iso}`) : undefined;

      let roster: { source: 'ENTRY' | 'PATTERN' | 'TEMPLATE' | 'NONE'; isWeeklyOff: boolean; shift: { id: number; name: string } | null } = { source: 'NONE', isWeeklyOff: false, shift: null };
      const entry = entryAt.get(iso);
      if (entry) roster = { source: 'ENTRY', isWeeklyOff: entry.isWeeklyOff, shift: entry.shift };
      else {
        const own = patterns.find((a) => covers(a, date));
        const group = own ? null : pickGroupAssignment(groupPatterns, who, date);
        const groupPattern = group ? gPatterns.find((p) => p.id === group.refId) : undefined;
        const pa = own ? { pattern: own.pattern, anchorDate: own.anchorDate } : groupPattern && group ? { pattern: groupPattern, anchorDate: group.anchorDate ?? group.effectiveFrom } : null;
        if (pa) {
          const day = pa.pattern.days.find((d) => d.dayIndex === cycleIndex(pa.anchorDate, date, pa.pattern.cycleDays));
          if (day) roster = { source: 'PATTERN', isWeeklyOff: day.isWeeklyOff, shift: day.shift };
        }
      }
      // No entry or pattern for the day: the weekly off template says which weekdays are off.
      if (roster.source === 'NONE') {
        const own = weeklyOffs.find((a) => covers(a, date));
        const group = own ? null : pickGroupAssignment(groupTemplates, who, date);
        const template = own ? own.template : group ? gTemplates.find((t) => t.id === group.refId) : undefined;
        if (template) roster = { source: 'TEMPLATE', isWeeklyOff: isWeeklyOffDay({ days: template.days, rules: template.rules as unknown as WeeklyOffRule[] }, date), shift: null };
      }

      const ownSchedule = schedules.find((a) => covers(a, date));
      const groupSchedule = ownSchedule ? null : pickGroupAssignment(groupSchedules, who, date);
      const sch = ownSchedule ?? (groupSchedule ? (() => { const w = gSchedules.find((x) => x.id === groupSchedule.refId); return w ? { workSchedule: w } : undefined; })() : undefined);
      days.push({
        date: iso,
        holiday: holiday ? { name: holiday.name, type: holiday.holidayType, calendarLevel: picked!.level } : null,
        roster,
        workSchedule: sch ? { id: sch.workSchedule.id, name: sch.workSchedule.name, scheduleType: sch.workSchedule.scheduleType } : null,
      });
    }
    return { employeeId, country, holidayOrder: order, days };
  }

  /* ------------------------------------------------------------------ single-day entries */

  async setEntry(dto: RosterEntryDto, user: CurrentUserPayload, ip?: string) {
    const date = parseIsoDate(dto.date);
    if (!date) throw new BadRequestException('Date must be a real date (YYYY-MM-DD)');
    if (!(await this.prisma.employee.findUnique({ where: { id: dto.employeeId }, select: { id: true } }))) throw new NotFoundException('Employee not found');
    const off = !!dto.isWeeklyOff;
    if (!off) {
      if (!dto.shiftId) throw new BadRequestException('Choose a shift, or mark the day as a weekly off');
      if (!(await this.prisma.shift.count({ where: { id: dto.shiftId, isActive: true } }))) throw new BadRequestException('Unknown or inactive shift');
    }
    const data = { shiftId: off ? null : dto.shiftId!, isWeeklyOff: off, source: 'MANUAL', createdById: user.profileId };
    const saved = await this.prisma.rosterEntry.upsert({
      where: { employeeId_date: { employeeId: dto.employeeId, date } },
      create: { employeeId: dto.employeeId, date, ...data },
      update: data,
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'ROSTER_ENTRY_SET', entityType: 'Employee', entityId: String(dto.employeeId), ipAddress: ip, metadata: { date: dto.date } });
    return saved;
  }

  /** Removing an entry puts the day back on the employee's pattern. */
  async clearEntry(employeeId: number, dateStr: string, user: CurrentUserPayload, ip?: string) {
    const date = parseIsoDate(dateStr);
    if (!date) throw new BadRequestException('Date must be a real date (YYYY-MM-DD)');
    const res = await this.prisma.rosterEntry.deleteMany({ where: { employeeId, date } });
    if (!res.count) throw new NotFoundException('No single-day entry on that date');
    await this.audit.log({ actorProfileId: user.profileId, action: 'ROSTER_ENTRY_CLEARED', entityType: 'Employee', entityId: String(employeeId), ipAddress: ip, metadata: { date: dateStr } });
  }

  /* ------------------------------------------------------------------ Excel import */

  rosterTemplate() {
    return buildTemplate('Roster', ['Employee Code', 'Date', 'Shift'], ['EMP-0001', '2026-12-01', 'Morning (or OFF)']);
  }

  async importRoster(file: { buffer: Buffer; originalname: string; size: number }, commit: boolean, user: CurrentUserPayload, ip?: string) {
    if (file.size > IMPORT_MAX_BYTES) throw new BadRequestException('File must be 2 MB or smaller');
    const sheet = await readSheet(file.buffer, ['Employee Code', 'Date', 'Shift']);

    const codes = [...new Set(sheet.map((r) => (r.cells[0] ?? '').trim().toUpperCase()).filter(Boolean))];
    const [employees, shifts] = await Promise.all([
      this.prisma.employee.findMany({ where: { employeeCode: { in: codes }, ...(user.branchAccess ? { branchId: { in: user.branchAccess } } : {}) }, select: { id: true, employeeCode: true } }),
      this.prisma.shift.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    ]);
    const { valid, errors } = validateRosterRows(
      sheet.map((r) => ({ row: r.row, employeeCode: r.cells[0], date: r.cells[1], shift: r.cells[2] })),
      new Map(employees.map((e) => [e.employeeCode.toUpperCase(), e.id])),
      new Map(shifts.map((s) => [s.name.toLowerCase(), s.id])),
    );

    if (!commit) return { committed: false, totalRows: sheet.length, validRows: valid.length, errors, preview: valid.slice(0, 50) };

    // Employee codes match case-insensitively, so look them up the same way when saving.
    await this.prisma.$transaction(
      valid.map((v) => {
        const date = parseIsoDate(v.date)!;
        const data = { shiftId: v.shiftId, isWeeklyOff: v.isWeeklyOff, source: 'IMPORT', createdById: user.profileId };
        return this.prisma.rosterEntry.upsert({
          where: { employeeId_date: { employeeId: v.employeeId, date } },
          create: { employeeId: v.employeeId, date, ...data },
          update: data,
        });
      }),
    );
    await this.prisma.attendanceImportLog.create({
      data: { kind: 'ROSTER', fileName: file.originalname.slice(0, 200), totalRows: sheet.length, importedRows: valid.length, failedRows: errors.length, errors: errors as unknown as Prisma.InputJsonValue, createdById: user.profileId },
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'ROSTER_IMPORTED', entityType: 'Roster', entityId: file.originalname.slice(0, 100), ipAddress: ip, metadata: { imported: valid.length, failed: errors.length } });
    return { committed: true, totalRows: sheet.length, validRows: valid.length, importedRows: valid.length, errors };
  }

  async importHistory() {
    return this.prisma.attendanceImportLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, kind: true, fileName: true, totalRows: true, importedRows: true, failedRows: true, createdAt: true } });
  }
}
