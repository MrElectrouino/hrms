import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../common/services/audit.service';
import { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { UserType } from '../common/constants/user-types';
import { RosterService } from '../attendance-setup/roster.service';
import { parseIsoDate, toIsoDate } from '../attendance-setup/attendance-logic';
import { AttendanceProcessingService } from '../attendance/attendance-processing.service';
import { AdjustBalanceDto, LeaveRequestDto } from './dto/leave.dto';
import { CalcResult, DayKind, TimelineDay, allocateFefo, compOffExpiry, countLeaveDays, isoAdd, leaveYear, monthlyCredit } from './leave-rules';

const HR_TYPES: number[] = [UserType.SystemAdmin, UserType.HRAdmin];
const MARGIN = 7;
const num = (d: Prisma.Decimal | number) => Number(d);
const rangeDates = (from: string, to: string): string[] => {
  const out: string[] = [];
  for (let d = from; d <= to; d = isoAdd(d, 1)) out.push(d);
  return out;
};
const today = () => new Date().toISOString().slice(0, 10);

@Injectable()
export class LeaveService {
  private readonly logger = new Logger(LeaveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly roster: RosterService,
    private readonly processing: AttendanceProcessingService,
  ) {}

  /* ------------------------------------------------------------------ who is asking */

  private async myEmployeeId(user: CurrentUserPayload) {
    const e = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true, isActive: true } });
    if (!e || !e.isActive) throw new ForbiddenException('Your account is not linked to an active employee record');
    return e.id;
  }

  /** HR (within their branches) or the employee's own manager may decide leave. */
  private async assertMayDecide(user: CurrentUserPayload, employeeId: number) {
    if (HR_TYPES.includes(user.userTypeId)) {
      if (user.branchAccess) {
        const e = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { branchId: true } });
        if (!e?.branchId || !user.branchAccess.includes(e.branchId)) throw new ForbiddenException("You do not have access to this employee's branch");
      }
      return;
    }
    const me = await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } });
    const target = await this.prisma.employee.findUnique({ where: { id: employeeId }, select: { reportingToId: true } });
    if (!me || target?.reportingToId !== me.id) throw new ForbiddenException('You can only decide leave for your own team');
  }

  /* ------------------------------------------------------------------ day calculation */

  /** Day kinds for a range plus a margin each side, from the roster and the holiday calendar. */
  private async timeline(employeeId: number, from: string, to: string): Promise<{ days: TimelineDay[]; noRoster: boolean }> {
    const start = isoAdd(from, -MARGIN);
    const end = isoAdd(to, MARGIN);
    const days: TimelineDay[] = [];
    let noRoster = false;
    for (let s = start; s <= end; s = isoAdd(s, 63)) {
      const e = isoAdd(s, 62) < end ? isoAdd(s, 62) : end;
      const r = await this.roster.resolveRange(employeeId, s, e);
      for (const d of r.days) {
        if (d.roster.source === 'NONE') noRoster = true;
        const kind: DayKind = d.holiday ? 'HOLIDAY' : d.roster.isWeeklyOff ? 'WEEKLY_OFF' : 'WORKING';
        days.push({ date: d.date, kind });
      }
    }
    return { days, noRoster };
  }

  private async calculate(employeeId: number, type: { id: number; isSandwichEligible: boolean }, from: string, to: string, halfDay: boolean, excludeApplicationId?: number) {
    const settings = await this.prisma.leaveSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    const { days, noRoster } = await this.timeline(employeeId, from, to);
    // Other leave of types that take part in sandwich leave, so leave on the far side of a weekend is seen.
    const others = await this.prisma.leaveApplication.findMany({
      where: { employeeId, status: { in: ['PENDING', 'APPROVED'] }, id: excludeApplicationId ? { not: excludeApplicationId } : undefined, leaveType: { isSandwichEligible: true }, fromDate: { lte: parseIsoDate(isoAdd(to, MARGIN))! }, toDate: { gte: parseIsoDate(isoAdd(from, -MARGIN))! } },
      select: { calculation: true },
    });
    const existing = new Set<string>();
    for (const o of others) for (const d of o.calculation as { date: string; reason: string }[]) if (d.reason === 'LEAVE' || d.reason === 'HALF_DAY') existing.add(d.date);
    const result = countLeaveDays(days, from, to, halfDay, { enabled: settings.sandwichEnabled, typeEligible: type.isSandwichEligible, weeklyOffs: settings.sandwichWeeklyOffs, holidays: settings.sandwichHolidays, requireBothSides: settings.sandwichRequireBothSides }, existing);
    return { result, noRoster };
  }

  /* ------------------------------------------------------------------ balances */

  private async creditsOf(employeeId: number, leaveTypeId: number, asOf = today()) {
    const rows = await this.prisma.leaveCredit.findMany({ where: { employeeId, leaveTypeId, remaining: { gt: 0 }, OR: [{ expiresOn: null }, { expiresOn: { gte: parseIsoDate(asOf)! } }] }, orderBy: [{ expiresOn: 'asc' }, { id: 'asc' }] });
    return rows.map((c) => ({ id: c.id, remaining: num(c.remaining), expiresOn: c.expiresOn ? toIsoDate(c.expiresOn) : null }));
  }

  async balances(employeeId: number) {
    const [types, pending] = await Promise.all([
      this.prisma.leaveType.findMany({ where: { isActive: true }, orderBy: [{ sortOrder: 'asc' }] }),
      this.prisma.leaveApplication.groupBy({ by: ['leaveTypeId'], where: { employeeId, status: 'PENDING' }, _sum: { totalDays: true } }),
    ]);
    const out = [];
    for (const t of types) {
      const credits = t.balanceTracking ? await this.creditsOf(employeeId, t.id) : [];
      const balance = credits.reduce((s, c) => s + c.remaining, 0);
      const pend = num(pending.find((p) => p.leaveTypeId === t.id)?._sum.totalDays ?? 0);
      const next = credits.filter((c) => c.expiresOn).sort((a, b) => (a.expiresOn! < b.expiresOn! ? -1 : 1))[0];
      out.push({ leaveTypeId: t.id, code: t.code, name: t.name, isPaid: t.isPaid, balanceTracking: t.balanceTracking, balance, pending: pend, available: balance - pend, nextExpiry: next?.expiresOn ?? null });
    }
    return out;
  }

  async myBalances(user: CurrentUserPayload) {
    return this.balances(await this.myEmployeeId(user));
  }

  /* ------------------------------------------------------------------ applying */

  private async checked(employeeId: number, dto: LeaveRequestDto, excludeApplicationId?: number) {
    const from = parseIsoDate(dto.fromDate);
    const to = parseIsoDate(dto.toDate);
    if (!from || !to) throw new BadRequestException('Dates must be real dates (YYYY-MM-DD)');
    if (to < from) throw new BadRequestException('The last day cannot be before the first day');
    if ((to.getTime() - from.getTime()) / 86_400_000 > 366) throw new BadRequestException('Leave can cover at most a year');
    const type = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!type || !type.isActive) throw new BadRequestException('Choose an active leave type');
    const halfDay = !!dto.halfDayPart;
    if (halfDay) {
      if (!type.allowHalfDay) throw new BadRequestException(`${type.name} cannot be taken as a half day`);
      if (dto.fromDate !== dto.toDate) throw new BadRequestException('A half day is a single day');
    }
    const { result, noRoster } = await this.calculate(employeeId, type, dto.fromDate, dto.toDate, halfDay, excludeApplicationId);
    if (result.totalDays <= 0) throw new BadRequestException('The days you chose are all off days or holidays, so there is no leave to take');
    if (type.maxDaysPerRequest && result.totalDays > type.maxDaysPerRequest) throw new BadRequestException(`${type.name} can be at most ${type.maxDaysPerRequest} days at a time`);
    const overlap = await this.prisma.leaveApplication.findFirst({ where: { employeeId, status: { in: ['PENDING', 'APPROVED'] }, id: excludeApplicationId ? { not: excludeApplicationId } : undefined, fromDate: { lte: to }, toDate: { gte: from } } });
    if (overlap) throw new ConflictException(`You already have leave from ${toIsoDate(overlap.fromDate)} to ${toIsoDate(overlap.toDate)} that overlaps these dates`);
    return { type, result, noRoster, from, to, halfDay };
  }

  private async available(employeeId: number, typeId: number): Promise<number> {
    const credits = await this.creditsOf(employeeId, typeId);
    const pending = await this.prisma.leaveApplication.aggregate({ where: { employeeId, leaveTypeId: typeId, status: 'PENDING' }, _sum: { totalDays: true } });
    return credits.reduce((s, c) => s + c.remaining, 0) - num(pending._sum.totalDays ?? 0);
  }

  /** What an application would take, before it is sent. */
  async preview(user: CurrentUserPayload, dto: LeaveRequestDto) {
    const employeeId = await this.myEmployeeId(user);
    const { type, result, noRoster } = await this.checked(employeeId, dto);
    const available = type.balanceTracking ? await this.available(employeeId, type.id) : null;
    const warnings: string[] = [];
    if (noRoster) warnings.push('You have no roster assigned, so every day is counted as a working day. Ask HR to assign your roster.');
    if (type.requiresDocument && result.totalDays > type.documentAfterDays) warnings.push(`${type.name} over ${type.documentAfterDays} day(s) needs a supporting document. Give it to HR.`);
    const enough = !type.balanceTracking || type.allowNegative || (available ?? 0) >= result.totalDays;
    return { ...result, leaveType: { id: type.id, name: type.name, isPaid: type.isPaid }, available, enough, warnings };
  }

  async apply(user: CurrentUserPayload, dto: LeaveRequestDto, ip?: string) {
    const employeeId = await this.myEmployeeId(user);
    const { type, result, from, to } = await this.checked(employeeId, dto);
    if (type.balanceTracking && !type.allowNegative) {
      const available = await this.available(employeeId, type.id);
      if (available < result.totalDays) throw new BadRequestException(`Not enough ${type.name}: ${available} available, ${result.totalDays} needed`);
    }
    const created = await this.prisma.leaveApplication.create({
      data: { employeeId, leaveTypeId: type.id, fromDate: from, toDate: to, halfDayPart: dto.halfDayPart ?? null, requestedDays: result.requestedDays, sandwichDays: result.sandwichDays, totalDays: result.totalDays, reason: dto.reason?.trim() || null, calculation: result.days as unknown as Prisma.InputJsonValue },
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_APPLIED', entityType: 'LeaveApplication', entityId: String(created.id), ipAddress: ip, metadata: { type: type.code, days: result.totalDays, sandwich: result.sandwichDays } });
    return this.present(await this.prisma.leaveApplication.findUniqueOrThrow({ where: { id: created.id }, include: this.include }));
  }

  /* ------------------------------------------------------------------ deciding and cancelling */

  async decide(user: CurrentUserPayload, id: number, approve: boolean, note: string | undefined, ip?: string) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id }, include: { leaveType: true } });
    if (!app) throw new NotFoundException('Application not found');
    if (app.status !== 'PENDING') throw new ConflictException('This application has already been decided');
    await this.assertMayDecide(user, app.employeeId);

    if (!approve) {
      await this.prisma.leaveApplication.update({ where: { id }, data: { status: 'REJECTED', decidedById: user.profileId, decidedAt: new Date(), decisionNote: note?.trim() || null } });
      await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_REJECTED', entityType: 'LeaveApplication', entityId: String(id), ipAddress: ip });
      return;
    }

    // The days are worked out again now: the roster or the holidays may have changed since it was sent.
    const fromStr = toIsoDate(app.fromDate);
    const toStr = toIsoDate(app.toDate);
    const { result } = await this.calculate(app.employeeId, app.leaveType, fromStr, toStr, !!app.halfDayPart, id);
    const total = result.totalDays;

    await this.prisma.$transaction(async (tx) => {
      if (app.leaveType.balanceTracking) {
        const credits = (await tx.leaveCredit.findMany({ where: { employeeId: app.employeeId, leaveTypeId: app.leaveTypeId, remaining: { gt: 0 }, OR: [{ expiresOn: null }, { expiresOn: { gte: parseIsoDate(today())! } }] } })).map((c) => ({ id: c.id, remaining: num(c.remaining), expiresOn: c.expiresOn ? toIsoDate(c.expiresOn) : null }));
        const { allocations, shortfall } = allocateFefo(credits, total);
        if (shortfall > 0 && !app.leaveType.allowNegative) throw new BadRequestException(`The balance does not cover ${total} days (${shortfall} short). Adjust the balance first.`);
        for (const a of allocations) {
          await tx.leaveCredit.update({ where: { id: a.creditId }, data: { remaining: { decrement: a.days } } });
          await tx.leaveAllocation.create({ data: { applicationId: id, creditId: a.creditId, days: a.days } });
        }
        const covered = total - shortfall;
        await tx.leaveTransaction.create({ data: { employeeId: app.employeeId, leaveTypeId: app.leaveTypeId, kind: 'DEBIT', days: -covered, applicationId: id, note: shortfall > 0 ? `${shortfall} day(s) beyond the balance` : null, createdById: user.profileId } });
      }
      await tx.leaveApplication.update({ where: { id }, data: { status: 'APPROVED', requestedDays: result.requestedDays, sandwichDays: result.sandwichDays, totalDays: total, calculation: result.days as unknown as Prisma.InputJsonValue, decidedById: user.profileId, decidedAt: new Date(), decisionNote: note?.trim() || null } });
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_APPROVED', entityType: 'LeaveApplication', entityId: String(id), ipAddress: ip, metadata: { days: total } });
    await this.refreshAttendance(app.employeeId, [...result.days.map((d) => d.date), ...rangeDates(fromStr, toStr)]);
  }

  /** Days that are already finished get their attendance rebuilt, so approved leave shows at once. */
  private async refreshAttendance(employeeId: number, dates: string[]) {
    const yesterday = isoAdd(today(), -1);
    for (const d of [...new Set(dates)].sort()) {
      if (d > yesterday) continue;
      try {
        await this.processing.processDay(employeeId, d);
      } catch (e) {
        this.logger.warn(`Could not refresh attendance for ${employeeId} on ${d}: ${(e as Error).message}`);
      }
    }
  }

  async cancel(user: CurrentUserPayload, id: number, ip?: string) {
    const app = await this.prisma.leaveApplication.findUnique({ where: { id }, include: { allocations: true } });
    if (!app) throw new NotFoundException('Application not found');
    const isHr = HR_TYPES.includes(user.userTypeId);
    const mine = (await this.prisma.employee.findUnique({ where: { profileId: user.profileId }, select: { id: true } }))?.id === app.employeeId;
    if (!isHr && !mine) throw new ForbiddenException('You can only cancel your own leave');
    if (app.status === 'CANCELLED' || app.status === 'REJECTED') throw new ConflictException('This application is already closed');
    if (app.status === 'APPROVED' && !isHr && toIsoDate(app.fromDate) <= today()) throw new ForbiddenException('Leave that has started can only be cancelled by HR');

    await this.prisma.$transaction(async (tx) => {
      if (app.status === 'APPROVED') {
        let given = 0;
        for (const a of app.allocations) {
          await tx.leaveCredit.update({ where: { id: a.creditId }, data: { remaining: { increment: a.days } } });
          given += num(a.days);
        }
        if (given > 0) await tx.leaveTransaction.create({ data: { employeeId: app.employeeId, leaveTypeId: app.leaveTypeId, kind: 'REVERSAL', days: given, applicationId: id, note: 'Leave cancelled', createdById: user.profileId } });
        await tx.leaveAllocation.deleteMany({ where: { applicationId: id } });
        // Days the job marked as leave go back to being worked out again.
        await tx.attendance.deleteMany({ where: { leaveApplicationId: id, isAutoGenerated: true } });
      }
      await tx.leaveApplication.update({ where: { id }, data: { status: 'CANCELLED', decidedById: user.profileId, decidedAt: new Date() } });
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_CANCELLED', entityType: 'LeaveApplication', entityId: String(id), ipAddress: ip });
    if (app.status === 'APPROVED') await this.refreshAttendance(app.employeeId, [...(app.calculation as { date: string }[]).map((d) => d.date), ...rangeDates(toIsoDate(app.fromDate), toIsoDate(app.toDate))]);
  }

  /* ------------------------------------------------------------------ reading */

  private include = { leaveType: { select: { id: true, code: true, name: true, isPaid: true } }, employee: { select: { employeeCode: true, profile: { select: { name: true, lastName: true } } } } } as const;

  private present(a: Prisma.LeaveApplicationGetPayload<{ include: LeaveService['include'] }>) {
    return {
      id: a.id,
      employeeId: a.employeeId,
      employeeCode: a.employee.employeeCode,
      employeeName: [a.employee.profile.name, a.employee.profile.lastName].filter(Boolean).join(' '),
      leaveType: a.leaveType,
      fromDate: toIsoDate(a.fromDate),
      toDate: toIsoDate(a.toDate),
      halfDayPart: a.halfDayPart,
      requestedDays: num(a.requestedDays),
      sandwichDays: num(a.sandwichDays),
      totalDays: num(a.totalDays),
      status: a.status,
      reason: a.reason,
      decisionNote: a.decisionNote,
      decidedAt: a.decidedAt,
      createdAt: a.createdAt,
      calculation: a.calculation,
    };
  }

  async mine(user: CurrentUserPayload) {
    const employeeId = await this.myEmployeeId(user);
    const rows = await this.prisma.leaveApplication.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' }, take: 100, include: this.include });
    return rows.map((r) => this.present(r));
  }

  private async scopeWhere(user: CurrentUserPayload): Promise<Prisma.LeaveApplicationWhereInput> {
    if (HR_TYPES.includes(user.userTypeId)) return user.activeBranchIds ? { employee: { branchId: { in: user.activeBranchIds } } } : {};
    return { employee: { reportingToId: await this.myEmployeeId(user) } };
  }

  /** Applications waiting for the caller (status PENDING), or any status. */
  async team(user: CurrentUserPayload, status?: string) {
    const rows = await this.prisma.leaveApplication.findMany({ where: { ...(await this.scopeWhere(user)), ...(status ? { status } : {}) }, orderBy: [{ status: 'asc' }, { fromDate: 'desc' }], take: 200, include: this.include });
    return rows.map((r) => this.present(r));
  }

  /** The leave calendar: approved and pending leave overlapping a range, for the team or for HR. */
  async calendar(user: CurrentUserPayload, fromStr: string, toStr: string, scope: 'me' | 'team') {
    const from = parseIsoDate(fromStr);
    const to = parseIsoDate(toStr);
    if (!from || !to || to < from) throw new BadRequestException('Give a valid from and to date');
    if ((to.getTime() - from.getTime()) / 86_400_000 > 93) throw new BadRequestException('Ask for at most three months at a time');
    const where: Prisma.LeaveApplicationWhereInput = { status: { in: ['PENDING', 'APPROVED'] }, fromDate: { lte: to }, toDate: { gte: from }, ...(scope === 'me' ? { employeeId: await this.myEmployeeId(user) } : await this.scopeWhere(user)) };
    const rows = await this.prisma.leaveApplication.findMany({ where, orderBy: { fromDate: 'asc' }, take: 500, include: this.include });
    return rows.map((r) => this.present(r));
  }

  /* ------------------------------------------------------------------ accrual, expiry, adjustments, comp off */

  /** Credits the leave year (annual types) or the month (monthly types). Running it twice credits nothing more. */
  async runAccrual(user: CurrentUserPayload | null, asOf = today()) {
    const settings = await this.prisma.leaveSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    const year = leaveYear(asOf, settings.leaveYearStartMonth);
    const types = await this.prisma.leaveType.findMany({ where: { isActive: true, accrual: { in: ['ANNUAL', 'MONTHLY'] }, balanceTracking: true } });
    const employees = await this.prisma.employee.findMany({ where: { isActive: true, dateOfJoining: { lte: parseIsoDate(asOf)! } }, select: { id: true } });
    let credited = 0;
    let skipped = 0;
    for (const t of types) {
      const monthly = t.accrual === 'MONTHLY';
      const days = monthly ? monthlyCredit(num(t.annualDays)) : num(t.annualDays);
      if (days <= 0) continue;
      const ref = monthly ? asOf.slice(0, 7) : year.label;
      const creditedOn = monthly ? `${asOf.slice(0, 7)}-01` : year.start;
      for (const e of employees) {
        try {
          await this.prisma.$transaction(async (tx) => {
            await tx.leaveCredit.create({ data: { employeeId: e.id, leaveTypeId: t.id, quantity: days, remaining: days, creditedOn: parseIsoDate(creditedOn)!, expiresOn: parseIsoDate(year.end), source: 'ACCRUAL', sourceRef: ref, createdById: user?.profileId } });
            await tx.leaveTransaction.create({ data: { employeeId: e.id, leaveTypeId: t.id, kind: 'CREDIT', days, note: `${t.name} ${ref}`, createdById: user?.profileId } });
          });
          credited++;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') skipped++;
          else throw err;
        }
      }
    }
    if (user) await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_ACCRUAL_RUN', entityType: 'LeaveCredit', entityId: asOf, metadata: { credited, skipped } });
    return { asOf, leaveYear: year.label, credited, alreadyCredited: skipped };
  }

  /** Balance that has passed its expiry date is closed, with a record of what expired. */
  async expireCredits(): Promise<number> {
    const due = await this.prisma.leaveCredit.findMany({ where: { remaining: { gt: 0 }, expiresOn: { lt: parseIsoDate(today())! } } });
    for (const c of due) {
      await this.prisma.$transaction([
        this.prisma.leaveCredit.update({ where: { id: c.id }, data: { remaining: 0 } }),
        this.prisma.leaveTransaction.create({ data: { employeeId: c.employeeId, leaveTypeId: c.leaveTypeId, kind: 'EXPIRY', days: -num(c.remaining), note: `Expired on ${toIsoDate(c.expiresOn!)}` } }),
      ]);
    }
    return due.length;
  }

  /** HR adds days (a credit with an optional expiry) or takes days away (earliest-expiring first). */
  async adjust(user: CurrentUserPayload, dto: AdjustBalanceDto, ip?: string) {
    if (!HR_TYPES.includes(user.userTypeId)) throw new ForbiddenException('Only HR can adjust a balance');
    await this.assertMayDecide(user, dto.employeeId);
    const type = await this.prisma.leaveType.findUnique({ where: { id: dto.leaveTypeId } });
    if (!type || !type.balanceTracking) throw new BadRequestException('That leave type does not keep a balance');
    if (!dto.days) throw new BadRequestException('Enter the number of days to add or take away');
    await this.prisma.$transaction(async (tx) => {
      if (dto.days > 0) {
        await tx.leaveCredit.create({ data: { employeeId: dto.employeeId, leaveTypeId: type.id, quantity: dto.days, remaining: dto.days, creditedOn: parseIsoDate(today())!, expiresOn: dto.expiresOn ? parseIsoDate(dto.expiresOn) : null, source: 'MANUAL', note: dto.note, createdById: user.profileId } });
      } else {
        const credits = (await tx.leaveCredit.findMany({ where: { employeeId: dto.employeeId, leaveTypeId: type.id, remaining: { gt: 0 } } })).map((c) => ({ id: c.id, remaining: num(c.remaining), expiresOn: c.expiresOn ? toIsoDate(c.expiresOn) : null }));
        const { allocations, shortfall } = allocateFefo(credits, -dto.days);
        if (shortfall > 0) throw new BadRequestException(`The balance only has ${-dto.days - shortfall} day(s) to take away`);
        for (const a of allocations) await tx.leaveCredit.update({ where: { id: a.creditId }, data: { remaining: { decrement: a.days } } });
      }
      await tx.leaveTransaction.create({ data: { employeeId: dto.employeeId, leaveTypeId: type.id, kind: 'ADJUSTMENT', days: dto.days, note: dto.note, createdById: user.profileId } });
    });
    await this.audit.log({ actorProfileId: user.profileId, action: 'LEAVE_BALANCE_ADJUSTED', entityType: 'Employee', entityId: String(dto.employeeId), ipAddress: ip, metadata: { type: type.code, days: dto.days } });
    return this.balances(dto.employeeId);
  }

  /** Employee's ledger: every credit, usage, expiry and adjustment. */
  async ledger(employeeId: number, leaveTypeId?: number) {
    const rows = await this.prisma.leaveTransaction.findMany({ where: { employeeId, ...(leaveTypeId ? { leaveTypeId } : {}) }, orderBy: { createdAt: 'desc' }, take: 200, include: { leaveType: { select: { name: true } } } });
    return rows.map((r) => ({ id: r.id, kind: r.kind, days: num(r.days), leaveType: r.leaveType.name, note: r.note, createdAt: r.createdAt }));
  }

  async ledgerFor(user: CurrentUserPayload, employeeId: number | undefined, leaveTypeId?: number) {
    if (!employeeId) return this.ledger(await this.myEmployeeId(user), leaveTypeId);
    await this.assertMayDecide(user, employeeId);
    return this.ledger(employeeId, leaveTypeId);
  }

  /**
   * Comp off: an approved day worked on a holiday or weekly off earns a credit (when switched on and
   * enough time was worked). One credit per day, so it is safe to run as often as needed.
   */
  async syncCompOff(sinceDays = 45): Promise<number> {
    const settings = await this.prisma.leaveSettings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
    if (!settings.compOffEnabled) return 0;
    const type = await this.prisma.leaveType.findFirst({ where: { isCompOff: true, isActive: true } });
    if (!type) return 0;
    const since = parseIsoDate(isoAdd(today(), -sinceDays))!;
    const days = await this.prisma.attendance.findMany({ where: { date: { gte: since }, statusCode: { in: ['WORKED_ON_HOLIDAY', 'WORKED_ON_WEEKLY_OFF'] }, approvedAt: { not: null }, workedMinutes: { gte: settings.compOffMinWorkedMinutes } }, select: { employeeId: true, date: true } });
    let granted = 0;
    for (const d of days) {
      const iso = toIsoDate(d.date);
      try {
        await this.prisma.$transaction(async (tx) => {
          const q = num(settings.compOffCreditDays);
          await tx.leaveCredit.create({ data: { employeeId: d.employeeId, leaveTypeId: type.id, quantity: q, remaining: q, creditedOn: parseIsoDate(today())!, expiresOn: compOffExpiry(today(), settings.compOffExpiryDays) ? parseIsoDate(compOffExpiry(today(), settings.compOffExpiryDays)!) : null, source: 'COMP_OFF', sourceRef: iso, note: `Worked on ${iso}` } });
          await tx.leaveTransaction.create({ data: { employeeId: d.employeeId, leaveTypeId: type.id, kind: 'CREDIT', days: q, note: `Comp off for ${iso}` } });
        });
        granted++;
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002')) throw err;
      }
    }
    return granted;
  }

  /** Nightly housekeeping: expire old balance, earn comp off, and credit a new month or year when it starts. */
  @Cron('30 2 * * *')
  async nightly() {
    try {
      const expired = await this.expireCredits();
      const comp = await this.syncCompOff();
      const acc = await this.runAccrual(null);
      this.logger.log(`Leave nightly: ${expired} expired, ${comp} comp off, ${acc.credited} credited`);
    } catch (e) {
      this.logger.error(`Leave nightly failed: ${(e as Error).message}`);
    }
  }
}

export type { CalcResult };
