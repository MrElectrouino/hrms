/**
 * Daily processing rules as pure functions: hours worked against hours required, short hours,
 * overtime, flexible start windows, and what a day with no punches should be.
 */
import { hhmmToMinutes } from './attendance-rules';
import { netWorkedMinutes } from '../attendance-setup/attendance-logic';

export interface HoursInput {
  /** Sum of every IN to OUT session, before any break. */
  grossMinutes: number;
  breakMinutes: number;
  breakAfterMinutes: number;
  requiredMinutes: number | null;
  shortEnabled: boolean;
  shortGraceMinutes: number;
  overtimeEnabled: boolean;
  overtimeAfterMinutes: number;
}

export interface HoursResult {
  netMinutes: number;
  shortMinutes: number;
  isShort: boolean;
  overtimeMinutes: number;
}

/** Net worked time (automatic break taken off), then short hours and overtime against the requirement. */
export function evaluateHours(i: HoursInput): HoursResult {
  const net = netWorkedMinutes(i.grossMinutes, i.breakMinutes, i.breakAfterMinutes);
  if (i.requiredMinutes === null) return { netMinutes: net, shortMinutes: 0, isShort: false, overtimeMinutes: 0 };
  const gap = Math.max(0, i.requiredMinutes - net);
  const isShort = i.shortEnabled && gap > i.shortGraceMinutes;
  const extra = net - i.requiredMinutes - i.overtimeAfterMinutes;
  return { netMinutes: net, shortMinutes: isShort ? gap : 0, isShort, overtimeMinutes: i.overtimeEnabled && extra > 0 ? extra : 0 };
}

/**
 * Flexible schedules have no fixed start, so there is no fixed-start late rule. When the schedule
 * has a start window, starting after the latest start is late; with no window nothing is late.
 */
export function flexibleLate(inMinutes: number, latestStart: string | null): { late: boolean; lateBy: number } {
  if (!latestStart) return { late: false, lateBy: 0 };
  const lateBy = Math.max(0, inMinutes - hhmmToMinutes(latestStart));
  return { late: lateBy > 0, lateBy };
}

/**
 * Once the day's hours are known, a day that is otherwise fine becomes SHORT_HOURS. Late, half day and
 * every status that skips the late rule keep their own status.
 */
export function statusAfterHours(current: string, isShort: boolean, currentSkipsLateRule: boolean): string {
  if (!isShort || currentSkipsLateRule) return current;
  return current === 'PRESENT' || current === 'NOT_APPROVED' ? 'SHORT_HOURS' : current;
}

/** And back again if a later correction fixes the hours. */
export function statusWhenHoursOk(current: string, requiresApprovalPending: boolean): string {
  return current === 'SHORT_HOURS' ? (requiresApprovalPending ? 'NOT_APPROVED' : 'PRESENT') : current;
}

/* ------------------------------------------------------------------ days with no punches */

export type Expectation = 'HOLIDAY' | 'WEEKLY_OFF' | 'WORK' | 'UNKNOWN';

/**
 * Was the person expected to work? A holiday wins. A roster entry or pattern says work or off.
 * With no roster at all we cannot tell, so we do not guess: nothing is marked absent.
 */
export function expectation(day: { isHoliday: boolean; rosterSource: 'ENTRY' | 'PATTERN' | 'NONE'; isWeeklyOff: boolean }): Expectation {
  if (day.isHoliday) return 'HOLIDAY';
  if (day.rosterSource === 'NONE') return 'UNKNOWN';
  return day.isWeeklyOff ? 'WEEKLY_OFF' : 'WORK';
}

/** Status for a date nobody marked. Approved leave on a working day beats absent. null = leave the day empty. */
export function statusForUnmarkedDay(exp: Expectation, onLeave: boolean): string | null {
  if (exp === 'HOLIDAY') return 'HOLIDAY';
  if (exp === 'WEEKLY_OFF') return onLeave ? 'ON_LEAVE' : 'WEEKLY_OFF';
  if (exp === 'WORK') return onLeave ? 'ON_LEAVE' : 'ABSENT';
  return onLeave ? 'ON_LEAVE' : null;
}
