/**
 * Pure rules for attendance setup (no I/O), so they can be unit tested:
 * holiday calendar order, roster cycles, break deduction, schedule checks and Excel row validation.
 */

/* ------------------------------------------------------------------ dates */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

/** 'YYYY-MM-DD' -> Date at UTC midnight, or null when not a real calendar date. */
export function parseIsoDate(s: unknown): Date | null {
  if (typeof s !== 'string' || !ISO_DATE.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s ? null : d;
}

export const toIsoDate = (d: Date): string => d.toISOString().slice(0, 10);

const DAY_MS = 86_400_000;
export const daysBetween = (from: Date, to: Date): number => Math.round((to.getTime() - from.getTime()) / DAY_MS);

/* ------------------------------------------------------------------ holiday calendar order */

export const HOLIDAY_LEVELS = ['EMPLOYEE', 'SITE', 'BRANCH', 'COUNTRY', 'COMPANY'] as const;
export type HolidayLevel = (typeof HOLIDAY_LEVELS)[number];
export const DEFAULT_HOLIDAY_ORDER: HolidayLevel[] = ['EMPLOYEE', 'SITE', 'BRANCH', 'COUNTRY', 'COMPANY'];

/** Reads the stored order (a JSON list). Unknown or repeated entries are dropped; missing levels are appended. */
export function parseHolidayOrder(value: string | null | undefined): HolidayLevel[] {
  let list: unknown = [];
  try {
    list = value ? JSON.parse(value) : [];
  } catch {
    list = [];
  }
  const out: HolidayLevel[] = [];
  for (const v of Array.isArray(list) ? list : []) {
    if ((HOLIDAY_LEVELS as readonly string[]).includes(v) && !out.includes(v as HolidayLevel)) out.push(v as HolidayLevel);
  }
  // An order saved before sites existed: a site calendar goes just before the branch one, not at the very end.
  const branchAt = out.indexOf('BRANCH');
  if (!out.includes('SITE') && branchAt >= 0) out.splice(branchAt, 0, 'SITE');
  for (const level of DEFAULT_HOLIDAY_ORDER) if (!out.includes(level)) out.push(level);
  return out;
}

/** The first level in the order that has a calendar for the employee wins. */
export function pickHolidayCalendar(order: HolidayLevel[], byLevel: Partial<Record<HolidayLevel, number | null>>): { level: HolidayLevel; calendarId: number } | null {
  for (const level of order) {
    const id = byLevel[level];
    if (id !== null && id !== undefined) return { level, calendarId: id };
  }
  return null;
}

/* ------------------------------------------------------------------ roster cycle */

/** Position in a repeating cycle of `cycleDays`, where `anchor` is cycle day 0. Works before the anchor too. */
export function cycleIndex(anchor: Date, date: Date, cycleDays: number): number {
  const diff = daysBetween(anchor, date);
  return ((diff % cycleDays) + cycleDays) % cycleDays;
}

export const ALLOWED_CYCLES = [7, 14, 21, 28] as const;

/* ------------------------------------------------------------------ time and breaks */

export const isValidHHmm = (s: unknown): s is string => typeof s === 'string' && HHMM.test(s);

export function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

/** Minutes from start to end; an end earlier than the start means it finishes the next day. */
export function minutesBetween(start: string, end: string): number {
  const diff = toMinutes(end) - toMinutes(start);
  return diff > 0 ? diff : diff + 24 * 60;
}

/**
 * Automatic break deduction: take `breakMinutes` off the worked time, but only when the person
 * worked at least `breakAfterMinutes` (0 = always). Never goes below zero.
 */
export function netWorkedMinutes(grossMinutes: number, breakMinutes: number, breakAfterMinutes: number): number {
  if (breakMinutes <= 0 || grossMinutes < breakAfterMinutes) return Math.max(0, grossMinutes);
  return Math.max(0, grossMinutes - breakMinutes);
}

export interface ScheduleInput {
  scheduleType?: string;
  startTime?: string | null;
  endTime?: string | null;
  earliestStartTime?: string | null;
  latestStartTime?: string | null;
  requiredDailyMinutes?: number;
  breakMinutes?: number;
  breakAfterMinutes?: number;
}

/** Returns a list of problems (empty when the schedule is valid). */
export function validateSchedule(s: ScheduleInput): string[] {
  const errors: string[] = [];
  if (s.scheduleType !== 'FIXED' && s.scheduleType !== 'FLEXIBLE') errors.push('Schedule type must be Fixed or Flexible');
  const req = s.requiredDailyMinutes;
  if (!Number.isInteger(req) || (req as number) < 1 || (req as number) > 24 * 60) errors.push('Required daily minutes must be between 1 and 1440');
  const brk = s.breakMinutes ?? 0;
  if (!Number.isInteger(brk) || brk < 0 || brk > 480) errors.push('Break minutes must be between 0 and 480');
  const after = s.breakAfterMinutes ?? 0;
  if (!Number.isInteger(after) || after < 0 || after > 24 * 60) errors.push('"Deduct break after" must be between 0 and 1440 minutes');

  if (s.scheduleType === 'FIXED') {
    if (!isValidHHmm(s.startTime) || !isValidHHmm(s.endTime)) errors.push('Fixed schedules need a start and end time (HH:mm)');
    else if (s.startTime === s.endTime) errors.push('Start and end time cannot be the same');
  }
  if (s.scheduleType === 'FLEXIBLE') {
    const e = s.earliestStartTime || null;
    const l = s.latestStartTime || null;
    if ((e && !isValidHHmm(e)) || (l && !isValidHHmm(l))) errors.push('Start window times must be HH:mm');
    else if ((e && !l) || (!e && l)) errors.push('Set both the earliest and latest start, or leave both empty');
    else if (e && l && toMinutes(l) < toMinutes(e)) errors.push('Latest start cannot be before the earliest start');
  }
  return errors;
}

/* ------------------------------------------------------------------ Excel rows */

export interface RowError {
  row: number;
  message: string;
}

export interface HolidayRowInput {
  row: number;
  date: string | null;
  name: string | null;
  type: string | null;
  endDate?: string | null;
}
export interface HolidayRowOk {
  row: number;
  date: string;
  endDate: string | null;
  name: string;
  holidayType: string;
}

/** Longest holiday that can be entered as one range. */
export const MAX_HOLIDAY_DAYS = 31;

export const HOLIDAY_TYPES = ['PUBLIC', 'COMPANY', 'OPTIONAL'] as const;

export function validateHolidayRows(rows: HolidayRowInput[]): { valid: HolidayRowOk[]; errors: RowError[] } {
  const valid: HolidayRowOk[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();
  for (const r of rows) {
    const problems: string[] = [];
    if (!parseIsoDate(r.date)) problems.push('Date must be a real date (YYYY-MM-DD)');
    const name = (r.name ?? '').trim();
    if (!name) problems.push('Holiday name is required');
    else if (name.length > 120) problems.push('Holiday name is too long (120 characters)');
    const type = (r.type ?? '').trim().toUpperCase() || 'PUBLIC';
    const end = (r.endDate ?? '').trim() || null;
    if (end) {
      const s = parseIsoDate(r.date);
      const e = parseIsoDate(end);
      if (!e) problems.push('End date must be a real date (YYYY-MM-DD)');
      else if (s && e < s) problems.push('End date cannot be before the date');
      else if (s && (e.getTime() - s.getTime()) / 86_400_000 + 1 > MAX_HOLIDAY_DAYS) problems.push(`A holiday can last at most ${MAX_HOLIDAY_DAYS} days`);
    }
    if (!(HOLIDAY_TYPES as readonly string[]).includes(type)) problems.push(`Type must be ${HOLIDAY_TYPES.join(', ')}`);
    if (r.date && seen.has(r.date)) problems.push(`Duplicate date (also on row ${seen.get(r.date)})`);
    if (r.date && !seen.has(r.date)) seen.set(r.date, r.row);
    if (problems.length) errors.push({ row: r.row, message: problems.join('; ') });
    else valid.push({ row: r.row, date: r.date as string, endDate: end && end !== r.date ? end : null, name, holidayType: type });
  }
  return { valid, errors };
}

/* ------------------------------------------------------------------ which calendar a holiday row belongs to */

export type CalendarTarget =
  | { scope: 'COMPANY'; key: string; label: string }
  | { scope: 'COUNTRY'; countryCode: string; key: string; label: string }
  | { scope: 'BRANCH'; branchId: number; key: string; label: string }
  | { scope: 'SITE'; siteId: number; key: string; label: string };

export interface TargetLists {
  countries: { isoCode: string; name: string }[];
  branches: { id: number; name: string; code: string }[];
  sites: { id: number; name: string }[];
}

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * The "Applies to" and "Value" columns of the holiday import. Applies to is Company, Country, Branch or Site; Value is the
 * country (name or code), branch (name or code) or site name. Both empty means the calendar chosen on screen.
 */
export function resolveCalendarTarget(appliesTo: string | null, value: string | null, lists: TargetLists): { target: CalendarTarget | null; error?: string } {
  const kind = (appliesTo ?? '').trim().toUpperCase();
  const v = (value ?? '').trim();
  if (!kind) return v ? { target: null, error: 'Value is filled in but "Applies to" is empty. Use Company, Country, Branch or Site' } : { target: null };
  if (kind === 'COMPANY') return { target: { scope: 'COMPANY', key: 'COMPANY', label: 'Company' } };
  if (!v) return { target: null, error: `Value is required when Applies to is ${kind.charAt(0)}${kind.slice(1).toLowerCase()} (enter the name)` };
  if (kind === 'COUNTRY') {
    const hits = lists.countries.filter((c) => same(c.isoCode, v) || same(c.name, v));
    if (hits.length !== 1) return { target: null, error: hits.length ? `More than one country matches "${v}"` : `No country "${v}" in System settings → Countries` };
    return { target: { scope: 'COUNTRY', countryCode: hits[0].isoCode, key: `COUNTRY:${hits[0].isoCode}`, label: `Country · ${hits[0].name}` } };
  }
  if (kind === 'BRANCH') {
    const hits = lists.branches.filter((b) => same(b.name, v) || same(b.code, v));
    if (hits.length !== 1) return { target: null, error: hits.length ? `More than one branch matches "${v}"` : `No branch named "${v}"` };
    return { target: { scope: 'BRANCH', branchId: hits[0].id, key: `BRANCH:${hits[0].id}`, label: `Branch · ${hits[0].name}` } };
  }
  if (kind === 'SITE') {
    const hits = lists.sites.filter((x) => same(x.name, v));
    if (hits.length !== 1) return { target: null, error: hits.length ? `More than one site matches "${v}"` : `No site named "${v}"` };
    return { target: { scope: 'SITE', siteId: hits[0].id, key: `SITE:${hits[0].id}`, label: `Site · ${hits[0].name}` } };
  }
  return { target: null, error: 'Applies to must be Company, Country, Branch or Site' };
}

export interface RosterRowInput {
  row: number;
  employeeCode: string | null;
  date: string | null;
  shift: string | null;
}
export interface RosterRowOk {
  row: number;
  employeeId: number;
  date: string;
  shiftId: number | null;
  isWeeklyOff: boolean;
}

export const OFF_WORDS = ['off', 'weekly off', 'weekoff', 'wo'];

export function validateRosterRows(
  rows: RosterRowInput[],
  employeesByCode: Map<string, number>,
  shiftsByName: Map<string, number>,
): { valid: RosterRowOk[]; errors: RowError[] } {
  const valid: RosterRowOk[] = [];
  const errors: RowError[] = [];
  const seen = new Map<string, number>();
  for (const r of rows) {
    const problems: string[] = [];
    const code = (r.employeeCode ?? '').trim().toUpperCase();
    const employeeId = employeesByCode.get(code);
    if (!code) problems.push('Employee code is required');
    else if (employeeId === undefined) problems.push(`Unknown employee code "${r.employeeCode}"`);
    if (!parseIsoDate(r.date)) problems.push('Date must be a real date (YYYY-MM-DD)');
    const shiftText = (r.shift ?? '').trim();
    let shiftId: number | null = null;
    let isWeeklyOff = false;
    if (!shiftText) problems.push('Shift is required (a shift name, or OFF)');
    else if (OFF_WORDS.includes(shiftText.toLowerCase())) isWeeklyOff = true;
    else {
      const id = shiftsByName.get(shiftText.toLowerCase());
      if (id === undefined) problems.push(`Unknown or inactive shift "${shiftText}"`);
      else shiftId = id;
    }
    const key = `${code}|${r.date}`;
    if (code && r.date && seen.has(key)) problems.push(`Duplicate employee and date (also on row ${seen.get(key)})`);
    if (code && r.date && !seen.has(key)) seen.set(key, r.row);
    if (problems.length) errors.push({ row: r.row, message: problems.join('; ') });
    else valid.push({ row: r.row, employeeId: employeeId as number, date: r.date as string, shiftId, isWeeklyOff });
  }
  return { valid, errors };
}

/* ------------------------------------------------------------------ assignments given to a branch, country or the company */

export type GroupScope = 'SITE' | 'BRANCH' | 'COUNTRY' | 'COMPANY';

export interface GroupAssignmentLike {
  scope: string;
  countryCode: string | null;
  branchId: number | null;
  siteId?: number | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
}

/**
 * The assignment that applies to an employee on a date when they have none of their own:
 * their site's first, then their branch's, then their country's, then the company's.
 */
export function pickGroupAssignment<T extends GroupAssignmentLike>(list: T[], who: { branchId: number | null; siteId?: number | null; country: string }, date: Date): T | null {
  const live = list.filter((a) => a.effectiveFrom <= date && (a.effectiveTo === null || a.effectiveTo >= date));
  return (
    live.find((a) => a.scope === 'SITE' && !!a.siteId && a.siteId === who.siteId) ??
    live.find((a) => a.scope === 'BRANCH' && a.branchId !== null && a.branchId === who.branchId) ??
    live.find((a) => a.scope === 'COUNTRY' && a.countryCode === who.country) ??
    live.find((a) => a.scope === 'COMPANY') ??
    null
  );
}
