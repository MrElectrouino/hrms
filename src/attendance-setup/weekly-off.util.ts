import { Prisma } from '@prisma/client';

/** 0 = Sunday ... 6 = Saturday, the same as JavaScript's getUTCDay(). */
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

/**
 * A weekday that is off only some weeks:
 * - WEEKS: only in the chosen occurrences of that weekday in the month (1 = first ... 5 = fifth, -1 = last).
 *          "2nd and 4th Saturday" is { day: 6, kind: 'WEEKS', weeks: [2, 4] }.
 * - ALTERNATE: every second week, starting on `anchor` (a date that falls on that weekday).
 */
export type WeeklyOffRule =
  | { day: number; kind: 'WEEKS'; weeks: number[] }
  | { day: number; kind: 'ALTERNATE'; anchor: string };

export interface WeeklyOffShape {
  /** Weekdays that are off every week. */
  days: number[];
  /** Weekdays that are off only some weeks. */
  rules: WeeklyOffRule[];
}

const ORDINAL: Record<number, string> = { 1: '1st', 2: '2nd', 3: '3rd', 4: '4th', 5: '5th', [-1]: 'last' };
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Which occurrence of its weekday a date is in its month (1 to 5), and whether it is the last one. */
export function occurrenceInMonth(date: Date): { nth: number; isLast: boolean } {
  const dom = date.getUTCDate();
  const daysInMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return { nth: Math.ceil(dom / 7), isLast: dom + 7 > daysInMonth };
}

/** Is this date a weekly off under the template? */
export function isWeeklyOffDay(t: WeeklyOffShape, date: Date): boolean {
  const dow = date.getUTCDay();
  if (t.days.includes(dow)) return true;
  for (const r of t.rules ?? []) {
    if (r.day !== dow) continue;
    if (r.kind === 'WEEKS') {
      const { nth, isLast } = occurrenceInMonth(date);
      if (r.weeks.includes(nth) || (isLast && r.weeks.includes(-1))) return true;
    } else {
      const anchor = new Date(`${r.anchor}T00:00:00Z`);
      const weeks = Math.round((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - anchor.getTime()) / (7 * 86_400_000));
      if (Math.abs(weeks) % 2 === 0) return true;
    }
  }
  return false;
}

const short = (d: number) => DAY_NAMES[d];

/** "Saturday, Sunday" style text for the every-week days, in week order starting Monday. */
export function describeDays(days: number[]): string {
  return WEEK_ORDER.filter((d) => days.includes(d)).map((d) => short(d)).join(', ');
}

/** Everything the template does, in words: "Sunday; Saturday (2nd, 4th)". */
export function describeTemplate(t: WeeklyOffShape): string {
  const parts: string[] = [];
  for (const d of WEEK_ORDER) {
    if (t.days.includes(d)) parts.push(short(d));
    const r = (t.rules ?? []).find((x) => x.day === d);
    if (!r) continue;
    if (r.kind === 'WEEKS') parts.push(`${short(d)} (${[...r.weeks].sort((a, b) => (a === -1 ? 9 : b === -1 ? -9 : a - b)).map((w) => ORDINAL[w]).join(', ')})`);
    else parts.push(`${short(d)} (every other week from ${r.anchor})`);
  }
  return parts.join('; ');
}

const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());

/** Problems with a set of weekly off days and rules. Empty = fine. */
export function validateTemplate(days: number[], rules: WeeklyOffRule[] = []): string[] {
  const problems: string[] = [];
  if (days.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) problems.push('Days must be Sunday to Saturday');
  if (new Set(days).size !== days.length) problems.push('A day is listed twice');
  if (new Set(days).size >= 7) problems.push('At least one day of the week must be a working day');
  const seen = new Set<number>();
  for (const r of rules) {
    if (!Number.isInteger(r.day) || r.day < 0 || r.day > 6) {
      problems.push('A rule needs a weekday (Sunday to Saturday)');
      continue;
    }
    if (days.includes(r.day)) problems.push(`${short(r.day)} is already off every week, so it cannot also have a rule`);
    if (seen.has(r.day)) problems.push(`${short(r.day)} has more than one rule`);
    seen.add(r.day);
    if (r.kind === 'WEEKS') {
      if (!Array.isArray(r.weeks) || r.weeks.length === 0) problems.push(`${short(r.day)}: choose at least one week of the month`);
      else if (r.weeks.some((w) => ![1, 2, 3, 4, 5, -1].includes(w)) || new Set(r.weeks).size !== r.weeks.length) problems.push(`${short(r.day)}: weeks must be 1st to 5th or last, once each`);
    } else if (r.kind === 'ALTERNATE') {
      if (!isDate(r.anchor)) problems.push(`${short(r.day)}: give the first day off (a real date)`);
      else if (new Date(`${r.anchor}T00:00:00Z`).getUTCDay() !== r.day) problems.push(`${short(r.day)}: the first day off must fall on a ${short(r.day)}`);
    } else {
      problems.push(`${short((r as { day: number }).day)}: unknown rule`);
    }
  }
  if (!days.length && !rules.length) problems.push('Choose at least one day off');
  return problems;
}

type Db = Pick<Prisma.TransactionClient, 'employeeWeeklyOff'>;

const dayBefore = (d: Date) => new Date(d.getTime() - 86_400_000);

/**
 * Makes `templateId` (or nothing, when null) the employee's weekly off from `from` on.
 * Earlier assignments keep their history: one that is still running is ended the day before.
 * Returns false when nothing needed changing.
 */
export async function assignWeeklyOff(db: Db, employeeId: number, templateId: number | null, from: Date): Promise<boolean> {
  const running = await db.employeeWeeklyOff.findMany({
    where: { employeeId, OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }] },
    orderBy: { effectiveFrom: 'asc' },
  });
  const current = running.find((a) => a.effectiveFrom <= from);
  if (current && current.templateId === templateId && current.effectiveTo === null && running.length === 1) return false;
  if (!current && templateId === null && running.length === 0) return false;

  for (const a of running) {
    if (a.effectiveFrom >= from) await db.employeeWeeklyOff.delete({ where: { id: a.id } });
    else await db.employeeWeeklyOff.update({ where: { id: a.id }, data: { effectiveTo: dayBefore(from) } });
  }
  if (templateId !== null) await db.employeeWeeklyOff.create({ data: { employeeId, templateId, effectiveFrom: from } });
  return true;
}
