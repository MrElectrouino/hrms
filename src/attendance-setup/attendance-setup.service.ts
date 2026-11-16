import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import {
  HOLIDAY_LEVELS,
  HolidayLevel,
  parseHolidayOrder,
  parseIsoDate,
  toIsoDate,
  validateHolidayRows,
  MAX_HOLIDAY_DAYS,
  validateSchedule,
} from './attendance-logic';
import {
  AssignHolidayCalendarDto,
  AssignPatternDto,
  AssignWorkScheduleDto,
  HolidayCalendarDto,
  HolidayDto,
  RosterPatternDto,
  WorkScheduleDto,
} from './dto/attendance.dto';
import { AssignWeeklyOffDto, WeeklyOffTemplateDto } from './dto/weekly-off.dto';
import { WeeklyOffRule, assignWeeklyOff, describeTemplate, validateTemplate } from './weekly-off.util';
import { IMPORT_MAX_BYTES, buildTemplate, readSheet } from './excel.util';

const HOLIDAY_ORDER_KEY = 'holiday_calendar_order';

function mustDate(s: string, label: string): Date {
  const d = parseIsoDate(s);
  if (!d) throw new BadRequestException(`${label} must be a real date (YYYY-MM-DD)`);
  return d;
}

const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);

@Injectable()
export class AttendanceSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private log(user: CurrentUserPayload, action: string, entityType: string, entityId: string | number, ip?: string, metadata?: Prisma.JsonObject) {
    return this.audit.log({ actorProfileId: user.profileId, action, entityType, entityId: String(entityId), ipAddress: ip, metadata });
  }

  private conflict(e: unknown, what: string): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new ConflictException(`${what} already exists`);
    throw e;
  }

  /* ------------------------------------------------------------------ work schedules */

  listSchedules() {
    return this.prisma.workSchedule.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }] });
  }

  private scheduleData(dto: Partial<WorkScheduleDto>) {
    const problems = validateSchedule(dto);
    if (problems.length) throw new BadRequestException(problems.join('. '));
    const fixed = dto.scheduleType === 'FIXED';
    return {
      scheduleType: dto.scheduleType!,
      startTime: fixed ? dto.startTime! : null,
      endTime: fixed ? dto.endTime! : null,
      earliestStartTime: fixed ? null : dto.earliestStartTime || null,
      latestStartTime: fixed ? null : dto.latestStartTime || null,
      requiredDailyMinutes: dto.requiredDailyMinutes!,
      breakMinutes: dto.breakMinutes ?? 0,
      breakAfterMinutes: dto.breakAfterMinutes ?? 0,
    };
  }

  async createSchedule(dto: WorkScheduleDto, user: CurrentUserPayload, ip?: string) {
    try {
      const created = await this.prisma.workSchedule.create({
        data: { code: dto.code.trim().toUpperCase(), name: dto.name.trim(), isActive: dto.isActive ?? true, ...this.scheduleData(dto) },
      });
      await this.log(user, 'WORK_SCHEDULE_CREATED', 'WorkSchedule', created.id, ip);
      return created;
    } catch (e) {
      return this.conflict(e, 'A work schedule with this code or name');
    }
  }

  async updateSchedule(id: number, dto: WorkScheduleDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.workSchedule.findUnique({ where: { id } }))) throw new NotFoundException('Work schedule not found');
    try {
      const updated = await this.prisma.workSchedule.update({
        where: { id },
        data: { code: dto.code.trim().toUpperCase(), name: dto.name.trim(), isActive: dto.isActive ?? true, ...this.scheduleData(dto) },
      });
      await this.log(user, 'WORK_SCHEDULE_UPDATED', 'WorkSchedule', id, ip);
      return updated;
    } catch (e) {
      return this.conflict(e, 'A work schedule with this code or name');
    }
  }

  /* ------------------------------------------------------------------ holiday calendar order */

  async getHolidayOrder(): Promise<HolidayLevel[]> {
    const row = await this.prisma.systemConfiguration.findUnique({ where: { name: HOLIDAY_ORDER_KEY } });
    return parseHolidayOrder(row?.value);
  }

  async setHolidayOrder(order: string[], user: CurrentUserPayload, ip?: string) {
    const clean = parseHolidayOrder(JSON.stringify(order));
    if (order.length !== HOLIDAY_LEVELS.length || new Set(order).size !== HOLIDAY_LEVELS.length || !order.every((o) => (HOLIDAY_LEVELS as readonly string[]).includes(o))) {
      throw new BadRequestException(`Order must list each of ${HOLIDAY_LEVELS.join(', ')} once`);
    }
    await this.prisma.systemConfiguration.upsert({
      where: { name: HOLIDAY_ORDER_KEY },
      create: { name: HOLIDAY_ORDER_KEY, value: JSON.stringify(clean), description: 'Which holiday calendar wins for an employee, first match first' },
      update: { value: JSON.stringify(clean) },
    });
    await this.log(user, 'HOLIDAY_ORDER_UPDATED', 'SystemConfiguration', HOLIDAY_ORDER_KEY, ip, { order: clean });
    return clean;
  }

  /* ------------------------------------------------------------------ holiday calendars */

  async listCalendars() {
    const rows = await this.prisma.holidayCalendar.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { _count: { select: { holidays: true, assignments: true } }, branch: { select: { id: true, name: true } } },
    });
    return rows.map(({ _count, branch, ...c }) => ({ ...c, holidayCount: _count.holidays, employeeCount: _count.assignments, branchName: branch?.name ?? null }));
  }

  private calendarData(dto: HolidayCalendarDto) {
    if (dto.scope === 'COUNTRY' && !dto.countryCode) throw new BadRequestException('Choose the country for a country calendar');
    if (dto.scope === 'BRANCH' && !dto.branchId) throw new BadRequestException('Choose the branch for a branch calendar');
    return {
      name: dto.name.trim(),
      scope: dto.scope,
      countryCode: dto.scope === 'COUNTRY' ? dto.countryCode!.toUpperCase() : null,
      branchId: dto.scope === 'BRANCH' ? dto.branchId! : null,
      isActive: dto.isActive ?? true,
    };
  }

  private async assertBranch(branchId: number | null) {
    if (!branchId) return;
    const ok = await this.prisma.branch.count({ where: { id: branchId } });
    if (!ok) throw new BadRequestException('Unknown branch');
  }

  async createCalendar(dto: HolidayCalendarDto, user: CurrentUserPayload, ip?: string) {
    const data = this.calendarData(dto);
    await this.assertBranch(data.branchId);
    try {
      const created = await this.prisma.holidayCalendar.create({ data });
      await this.log(user, 'HOLIDAY_CALENDAR_CREATED', 'HolidayCalendar', created.id, ip);
      return created;
    } catch (e) {
      return this.conflict(e, 'A holiday calendar with this name');
    }
  }

  async updateCalendar(id: number, dto: HolidayCalendarDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.holidayCalendar.findUnique({ where: { id } }))) throw new NotFoundException('Holiday calendar not found');
    const data = this.calendarData(dto);
    await this.assertBranch(data.branchId);
    try {
      const updated = await this.prisma.holidayCalendar.update({ where: { id }, data });
      await this.log(user, 'HOLIDAY_CALENDAR_UPDATED', 'HolidayCalendar', id, ip);
      return updated;
    } catch (e) {
      return this.conflict(e, 'A holiday calendar with this name');
    }
  }

  async getCalendar(id: number) {
    const c = await this.prisma.holidayCalendar.findUnique({ where: { id }, include: { holidays: { orderBy: { date: 'asc' } } } });
    if (!c) throw new NotFoundException('Holiday calendar not found');
    return { ...c, holidays: c.holidays.map((h) => ({ ...h, date: toIsoDate(h.date), endDate: h.endDate ? toIsoDate(h.endDate) : null })) };
  }

  async saveHoliday(calendarId: number, dto: HolidayDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.holidayCalendar.findUnique({ where: { id: calendarId } }))) throw new NotFoundException('Holiday calendar not found');
    const date = mustDate(dto.date, 'Date');
    const endDate = dto.endDate && dto.endDate !== dto.date ? mustDate(dto.endDate, 'End date') : null;
    if (endDate) {
      if (endDate < date) throw new BadRequestException('The end date cannot be before the date');
      if ((endDate.getTime() - date.getTime()) / 86_400_000 + 1 > MAX_HOLIDAY_DAYS) throw new BadRequestException(`A holiday can last at most ${MAX_HOLIDAY_DAYS} days`);
    }
    // Two holidays in one calendar must not cover the same day.
    const last = endDate ?? date;
    const clash = await this.prisma.holiday.findFirst({
      where: { calendarId, date: { not: date, lte: last }, OR: [{ endDate: { gte: date } }, { endDate: null, date: { gte: date } }] },
      select: { name: true, date: true },
    });
    if (clash) throw new BadRequestException(`This overlaps "${clash.name}" (${toIsoDate(clash.date)}) in the same calendar`);
    const saved = await this.prisma.holiday.upsert({
      where: { calendarId_date: { calendarId, date } },
      create: { calendarId, date, endDate, name: dto.name.trim(), holidayType: dto.holidayType ?? 'PUBLIC' },
      update: { endDate, name: dto.name.trim(), holidayType: dto.holidayType ?? 'PUBLIC' },
    });
    await this.log(user, 'HOLIDAY_SAVED', 'HolidayCalendar', calendarId, ip, { date: dto.date, endDate: dto.endDate ?? null });
    return { ...saved, date: toIsoDate(saved.date), endDate: saved.endDate ? toIsoDate(saved.endDate) : null };
  }

  async removeHoliday(calendarId: number, holidayId: number, user: CurrentUserPayload, ip?: string) {
    const h = await this.prisma.holiday.findFirst({ where: { id: holidayId, calendarId } });
    if (!h) throw new NotFoundException('Holiday not found');
    await this.prisma.holiday.delete({ where: { id: holidayId } });
    await this.log(user, 'HOLIDAY_REMOVED', 'HolidayCalendar', calendarId, ip, { date: toIsoDate(h.date) });
  }

  holidayTemplate() {
    return buildTemplate('Holidays', ['Date', 'Name', 'Type', 'End date'], ['2026-01-26', 'Republic Day', 'PUBLIC', '']);
  }

  /**
   * Excel import for one calendar. Without `commit` it only checks the file (preview). With `commit`,
   * valid rows are saved (existing dates are updated) and the rest are reported: partial import.
   */
  async importHolidays(calendarId: number, file: { buffer: Buffer; originalname: string; size: number }, commit: boolean, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.holidayCalendar.findUnique({ where: { id: calendarId } }))) throw new NotFoundException('Holiday calendar not found');
    if (file.size > IMPORT_MAX_BYTES) throw new BadRequestException('File must be 2 MB or smaller');
    const sheet = await readSheet(file.buffer, ['Date', 'Name', 'Type'], ['End date']);
    const { valid, errors } = validateHolidayRows(sheet.map((r) => ({ row: r.row, date: r.cells[0], name: r.cells[1], type: r.cells[2], endDate: r.cells[3] })));

    if (!commit) return { committed: false, totalRows: sheet.length, validRows: valid.length, errors, preview: valid.slice(0, 50) };

    await this.prisma.$transaction(
      valid.map((v) =>
        this.prisma.holiday.upsert({
          where: { calendarId_date: { calendarId, date: parseIsoDate(v.date)! } },
          create: { calendarId, date: parseIsoDate(v.date)!, endDate: v.endDate ? parseIsoDate(v.endDate) : null, name: v.name, holidayType: v.holidayType },
          update: { endDate: v.endDate ? parseIsoDate(v.endDate) : null, name: v.name, holidayType: v.holidayType },
        }),
      ),
    );
    await this.prisma.attendanceImportLog.create({
      data: { kind: 'HOLIDAY', fileName: file.originalname.slice(0, 200), totalRows: sheet.length, importedRows: valid.length, failedRows: errors.length, errors: errors as unknown as Prisma.InputJsonValue, createdById: user.profileId },
    });
    await this.log(user, 'HOLIDAYS_IMPORTED', 'HolidayCalendar', calendarId, ip, { imported: valid.length, failed: errors.length });
    return { committed: true, totalRows: sheet.length, validRows: valid.length, importedRows: valid.length, errors };
  }

  /* ------------------------------------------------------------------ roster patterns */

  async listPatterns() {
    const rows = await this.prisma.rosterPattern.findMany({
      orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
      include: { days: { orderBy: { dayIndex: 'asc' } }, _count: { select: { assignments: true } } },
    });
    return rows.map(({ _count, ...p }) => ({ ...p, employeeCount: _count.assignments }));
  }

  private async patternDays(dto: RosterPatternDto) {
    const seen = new Set<number>();
    const days: { dayIndex: number; shiftId: number | null; isWeeklyOff: boolean }[] = [];
    for (const d of dto.days) {
      if (d.dayIndex >= dto.cycleDays) throw new BadRequestException(`Day ${d.dayIndex + 1} is outside the ${dto.cycleDays}-day cycle`);
      if (seen.has(d.dayIndex)) throw new BadRequestException(`Day ${d.dayIndex + 1} is listed twice`);
      seen.add(d.dayIndex);
      const off = !!d.isWeeklyOff;
      if (!off && !d.shiftId) throw new BadRequestException(`Day ${d.dayIndex + 1}: choose a shift or mark it as a weekly off`);
      days.push({ dayIndex: d.dayIndex, shiftId: off ? null : d.shiftId!, isWeeklyOff: off });
    }
    if (days.length !== dto.cycleDays) throw new BadRequestException(`Fill all ${dto.cycleDays} days of the cycle`);
    const shiftIds = [...new Set(days.map((d) => d.shiftId).filter((x): x is number => x !== null))];
    if (shiftIds.length && (await this.prisma.shift.count({ where: { id: { in: shiftIds }, isActive: true } })) !== shiftIds.length) {
      throw new BadRequestException('A chosen shift does not exist or is inactive');
    }
    return days;
  }

  async createPattern(dto: RosterPatternDto, user: CurrentUserPayload, ip?: string) {
    const days = await this.patternDays(dto);
    try {
      const created = await this.prisma.rosterPattern.create({
        data: { name: dto.name.trim(), cycleDays: dto.cycleDays, isActive: dto.isActive ?? true, days: { create: days } },
        include: { days: { orderBy: { dayIndex: 'asc' } } },
      });
      await this.log(user, 'ROSTER_PATTERN_CREATED', 'RosterPattern', created.id, ip);
      return created;
    } catch (e) {
      return this.conflict(e, 'A roster pattern with this name');
    }
  }

  async updatePattern(id: number, dto: RosterPatternDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.rosterPattern.findUnique({ where: { id } }))) throw new NotFoundException('Roster pattern not found');
    const days = await this.patternDays(dto);
    try {
      const [, , updated] = await this.prisma.$transaction([
        this.prisma.rosterPatternDay.deleteMany({ where: { patternId: id } }),
        this.prisma.rosterPatternDay.createMany({ data: days.map((d) => ({ ...d, patternId: id })) }),
        this.prisma.rosterPattern.update({ where: { id }, data: { name: dto.name.trim(), cycleDays: dto.cycleDays, isActive: dto.isActive ?? true }, include: { days: { orderBy: { dayIndex: 'asc' } } } }),
      ]);
      await this.log(user, 'ROSTER_PATTERN_UPDATED', 'RosterPattern', id, ip);
      return updated;
    } catch (e) {
      return this.conflict(e, 'A roster pattern with this name');
    }
  }

  /* ------------------------------------------------------------------ employee assignments (effective-dated) */

  async listAssignments(employeeId: number) {
    const [schedules, patterns, calendars] = await Promise.all([
      this.prisma.employeeWorkSchedule.findMany({ where: { employeeId }, orderBy: { effectiveFrom: 'desc' }, include: { workSchedule: { select: { id: true, name: true, code: true } } } }),
      this.prisma.employeeRosterPattern.findMany({ where: { employeeId }, orderBy: { effectiveFrom: 'desc' }, include: { pattern: { select: { id: true, name: true, cycleDays: true } } } }),
      this.prisma.employeeHolidayCalendar.findMany({ where: { employeeId }, orderBy: { effectiveFrom: 'desc' }, include: { calendar: { select: { id: true, name: true } } } }),
    ]);
    const f = (d: Date | null) => (d ? toIsoDate(d) : null);
    return {
      workSchedules: schedules.map((a) => ({ id: a.id, ref: a.workSchedule, effectiveFrom: f(a.effectiveFrom), effectiveTo: f(a.effectiveTo) })),
      rosterPatterns: patterns.map((a) => ({ id: a.id, ref: a.pattern, effectiveFrom: f(a.effectiveFrom), effectiveTo: f(a.effectiveTo), anchorDate: f(a.anchorDate) })),
      holidayCalendars: calendars.map((a) => ({ id: a.id, ref: a.calendar, effectiveFrom: f(a.effectiveFrom), effectiveTo: f(a.effectiveTo) })),
    };
  }

  private async assertEmployee(id: number) {
    if (!(await this.prisma.employee.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Employee not found');
  }

  /**
   * A new assignment starts on `from` and closes the one that was open on that date (it ends the
   * day before). A later-dated assignment must be ended first, so ranges never overlap.
   */
  private async newAssignment(
    from: Date,
    list: () => Promise<{ id: number; effectiveFrom: Date; effectiveTo: Date | null }[]>,
    close: (id: number, to: Date) => Prisma.PrismaPromise<unknown>,
    create: () => Prisma.PrismaPromise<unknown>,
  ) {
    const existing = await list();
    if (existing.some((a) => a.effectiveFrom >= from)) {
      throw new BadRequestException('There is already an assignment starting on or after this date. End or delete it first.');
    }
    const open = existing.filter((a) => a.effectiveTo === null || a.effectiveTo >= from);
    const ops = open.map((a) => close(a.id, dayBefore(from)));
    const [created] = await this.prisma.$transaction([create(), ...ops]);
    return created;
  }

  async assignWorkSchedule(employeeId: number, dto: AssignWorkScheduleDto, user: CurrentUserPayload, ip?: string) {
    await this.assertEmployee(employeeId);
    const from = mustDate(dto.effectiveFrom, 'Effective from');
    const ws = await this.prisma.workSchedule.findUnique({ where: { id: dto.workScheduleId } });
    if (!ws || !ws.isActive) throw new BadRequestException('Choose an active work schedule');
    const created = await this.newAssignment(
      from,
      () => this.prisma.employeeWorkSchedule.findMany({ where: { employeeId } }),
      (id, to) => this.prisma.employeeWorkSchedule.update({ where: { id }, data: { effectiveTo: to } }),
      () => this.prisma.employeeWorkSchedule.create({ data: { employeeId, workScheduleId: ws.id, effectiveFrom: from } }),
    );
    await this.log(user, 'WORK_SCHEDULE_ASSIGNED', 'Employee', employeeId, ip, { workScheduleId: ws.id, from: dto.effectiveFrom });
    return created;
  }

  async assignPattern(employeeId: number, dto: AssignPatternDto, user: CurrentUserPayload, ip?: string) {
    await this.assertEmployee(employeeId);
    const from = mustDate(dto.effectiveFrom, 'Effective from');
    const anchor = dto.anchorDate ? mustDate(dto.anchorDate, 'Cycle start date') : from;
    const pattern = await this.prisma.rosterPattern.findUnique({ where: { id: dto.patternId } });
    if (!pattern || !pattern.isActive) throw new BadRequestException('Choose an active roster pattern');
    const created = await this.newAssignment(
      from,
      () => this.prisma.employeeRosterPattern.findMany({ where: { employeeId } }),
      (id, to) => this.prisma.employeeRosterPattern.update({ where: { id }, data: { effectiveTo: to } }),
      () => this.prisma.employeeRosterPattern.create({ data: { employeeId, patternId: pattern.id, effectiveFrom: from, anchorDate: anchor } }),
    );
    await this.log(user, 'ROSTER_PATTERN_ASSIGNED', 'Employee', employeeId, ip, { patternId: pattern.id, from: dto.effectiveFrom });
    return created;
  }

  async assignHolidayCalendar(employeeId: number, dto: AssignHolidayCalendarDto, user: CurrentUserPayload, ip?: string) {
    await this.assertEmployee(employeeId);
    const from = mustDate(dto.effectiveFrom, 'Effective from');
    const cal = await this.prisma.holidayCalendar.findUnique({ where: { id: dto.calendarId } });
    if (!cal || !cal.isActive) throw new BadRequestException('Choose an active holiday calendar');
    const created = await this.newAssignment(
      from,
      () => this.prisma.employeeHolidayCalendar.findMany({ where: { employeeId } }),
      (id, to) => this.prisma.employeeHolidayCalendar.update({ where: { id }, data: { effectiveTo: to } }),
      () => this.prisma.employeeHolidayCalendar.create({ data: { employeeId, calendarId: cal.id, effectiveFrom: from } }),
    );
    await this.log(user, 'HOLIDAY_CALENDAR_ASSIGNED', 'Employee', employeeId, ip, { calendarId: cal.id, from: dto.effectiveFrom });
    return created;
  }

  /* ------------------------------------------------------------------ weekly off templates */

  async listWeeklyOffTemplates() {
    const rows = await this.prisma.weeklyOffTemplate.findMany({ orderBy: [{ isActive: 'desc' }, { name: 'asc' }], include: { _count: { select: { assignments: true } } } });
    const today = new Date(`${toIsoDate(new Date())}T00:00:00Z`);
    const current = await this.prisma.employeeWeeklyOff.groupBy({ by: ['templateId'], _count: { _all: true }, where: { effectiveFrom: { lte: today }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }] } });
    const now = new Map(current.map((c) => [c.templateId, c._count._all]));
    return rows.map(({ _count, ...t }) => ({ ...t, daysText: describeTemplate({ days: t.days, rules: t.rules as unknown as WeeklyOffRule[] }), employeeCount: now.get(t.id) ?? 0, everAssigned: _count.assignments > 0 }));
  }

  private weeklyOffData(dto: WeeklyOffTemplateDto) {
    const days = [...new Set(dto.days)].sort((a, b) => a - b);
    const rules: WeeklyOffRule[] = (dto.rules ?? []).map((r) => (r.kind === 'WEEKS' ? { day: r.day, kind: 'WEEKS', weeks: [...new Set(r.weeks ?? [])] } : { day: r.day, kind: 'ALTERNATE', anchor: r.anchor ?? '' }));
    const problems = validateTemplate(days, rules);
    if (problems.length) throw new BadRequestException(problems[0]);
    return { name: dto.name.trim(), days, rules: rules as unknown as Prisma.InputJsonValue, note: dto.note?.trim() || null, isActive: dto.isActive ?? true };
  }

  async createWeeklyOffTemplate(dto: WeeklyOffTemplateDto, user: CurrentUserPayload, ip?: string) {
    const data = this.weeklyOffData(dto);
    try {
      const created = await this.prisma.weeklyOffTemplate.create({ data });
      await this.log(user, 'WEEKLY_OFF_TEMPLATE_CREATED', 'WeeklyOffTemplate', created.id, ip);
      return created;
    } catch (e) {
      return this.conflict(e, 'A weekly off template with this name');
    }
  }

  async updateWeeklyOffTemplate(id: number, dto: WeeklyOffTemplateDto, user: CurrentUserPayload, ip?: string) {
    if (!(await this.prisma.weeklyOffTemplate.findUnique({ where: { id }, select: { id: true } }))) throw new NotFoundException('Weekly off template not found');
    const data = this.weeklyOffData(dto);
    try {
      const updated = await this.prisma.weeklyOffTemplate.update({ where: { id }, data });
      await this.log(user, 'WEEKLY_OFF_TEMPLATE_UPDATED', 'WeeklyOffTemplate', id, ip);
      return updated;
    } catch (e) {
      return this.conflict(e, 'A weekly off template with this name');
    }
  }

  /** A template that has ever been assigned is kept (history depends on it): switch it off instead. */
  async deleteWeeklyOffTemplate(id: number, user: CurrentUserPayload, ip?: string) {
    const t = await this.prisma.weeklyOffTemplate.findUnique({ where: { id }, select: { id: true, name: true } });
    if (!t) throw new NotFoundException('Weekly off template not found');
    if ((await this.prisma.employeeWeeklyOff.count({ where: { templateId: id } })) > 0) {
      throw new ConflictException(`"${t.name}" is, or was, assigned to employees, so it cannot be deleted. Switch it off instead.`);
    }
    await this.prisma.weeklyOffTemplate.delete({ where: { id } });
    await this.log(user, 'WEEKLY_OFF_TEMPLATE_DELETED', 'WeeklyOffTemplate', id, ip, { name: t.name });
  }

  /** Gives one employee a weekly off template from a date (default today), or removes it with templateId null. */
  async assignWeeklyOff(employeeId: number, dto: AssignWeeklyOffDto, user: CurrentUserPayload, ip?: string) {
    await this.assertEmployee(employeeId);
    const from = mustDate(dto.effectiveFrom ?? toIsoDate(new Date()), 'Effective from');
    const templateId = dto.templateId ?? null;
    if (templateId !== null) {
      const t = await this.prisma.weeklyOffTemplate.findUnique({ where: { id: templateId }, select: { isActive: true } });
      if (!t || !t.isActive) throw new BadRequestException('Choose an active weekly off template');
    }
    const changed = await this.prisma.$transaction((tx) => assignWeeklyOff(tx, employeeId, templateId, from));
    await this.log(user, 'WEEKLY_OFF_ASSIGNED', 'Employee', employeeId, ip, { templateId, from: toIsoDate(from) });
    return { changed };
  }

  /** Removes an assignment of the given kind (work-schedule | roster-pattern | holiday-calendar). */
  async removeAssignment(employeeId: number, kind: string, assignmentId: number, user: CurrentUserPayload, ip?: string) {
    const where = { id: assignmentId, employeeId };
    let count = 0;
    if (kind === 'work-schedule') count = (await this.prisma.employeeWorkSchedule.deleteMany({ where })).count;
    else if (kind === 'roster-pattern') count = (await this.prisma.employeeRosterPattern.deleteMany({ where })).count;
    else if (kind === 'holiday-calendar') count = (await this.prisma.employeeHolidayCalendar.deleteMany({ where })).count;
    else throw new BadRequestException('Unknown assignment type');
    if (!count) throw new NotFoundException('Assignment not found');
    await this.log(user, 'ASSIGNMENT_REMOVED', 'Employee', employeeId, ip, { kind, assignmentId });
  }
}
