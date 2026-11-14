/**
 * Attendance marking rules as pure functions (no I/O), so every rule can be unit tested.
 * They replace the logic inside the AddUpdateAttendance (India) and AddUpdateMuster (UAE)
 * stored procedures. Country differences are policy settings, not separate code paths.
 */

/* ------------------------------------------------------------------ time and timezone */

/** Local calendar date (YYYY-MM-DD) and minutes since local midnight, for an instant in an IANA timezone. */
export function localParts(instant: Date, timeZone: string): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

export function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const hhmmToMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** The instant at which the given local date and HH:mm happen in a timezone (handles daylight saving). */
export function instantFromLocal(date: string, hhmm: string, timeZone: string): Date {
  const [y, mo, d] = date.split('-').map(Number);
  const wanted = Date.UTC(y, mo - 1, d, ...(hhmm.split(':').map(Number) as [number, number]));
  // Start from the wall clock read as UTC, then correct by the zone's offset at that moment (twice for DST edges).
  let guess = wanted;
  for (let i = 0; i < 2; i++) {
    const p = localParts(new Date(guess), timeZone);
    const [py, pm, pd] = p.date.split('-').map(Number);
    const shown = Date.UTC(py, pm - 1, pd, Math.floor(p.minutes / 60), p.minutes % 60);
    guess += wanted - shown;
  }
  return new Date(guess);
}

/* ------------------------------------------------------------------ late and half-day */

export type LateOutcome = 'ON_TIME' | 'LATE' | 'HALF_DAY';

export interface LateInput {
  /** Local minutes since midnight of the first IN. */
  inMinutes: number;
  /** Local minutes since midnight of the shift start (the Ramadan start when it applies). */
  startMinutes: number;
  lateMinutes: number;
  halfDayMinutes: number;
  lateEnabled: boolean;
  halfDayEnabled: boolean;
}

/**
 * Same thresholds as the procedures: up to LateMinutes after the start is on time (grace),
 * beyond that up to HalfDayMinutes is late, beyond that is a half day.
 * A switched-off rule falls back to the next one that is on.
 */
export function evaluateLate(i: LateInput): { outcome: LateOutcome; lateBy: number } {
  const lateBy = Math.max(0, i.inMinutes - i.startMinutes);
  if (lateBy <= i.lateMinutes) return { outcome: 'ON_TIME', lateBy };
  if (lateBy <= i.halfDayMinutes) return { outcome: i.lateEnabled ? 'LATE' : 'ON_TIME', lateBy };
  if (i.halfDayEnabled) return { outcome: 'HALF_DAY', lateBy };
  return { outcome: i.lateEnabled ? 'LATE' : 'ON_TIME', lateBy };
}

/* ------------------------------------------------------------------ who may do what */

export interface MarkingPolicy {
  allowPastDateSelfMarking: boolean;
  selfMarkCutoffTime: string | null;
}

export type Check = { ok: true } | { ok: false; code: 'PAST_DATE' | 'AFTER_CUTOFF' | 'FUTURE_DATE'; message: string };

/**
 * An employee pressing IN / OUT. `date` is the attendance date, `today` and `localMinutes`
 * are the current local date and time in the employee's timezone.
 */
export function checkSelfMark(policy: MarkingPolicy, date: string, today: string, localMinutes: number): Check {
  if (date > today) return { ok: false, code: 'FUTURE_DATE', message: 'Attendance cannot be marked for a future date' };
  if (date < today) {
    return policy.allowPastDateSelfMarking ? { ok: true } : { ok: false, code: 'PAST_DATE', message: 'Attendance for a past date cannot be marked by the employee. Ask your manager or HR.' };
  }
  if (policy.selfMarkCutoffTime && localMinutes > hhmmToMinutes(policy.selfMarkCutoffTime)) {
    return { ok: false, code: 'AFTER_CUTOFF', message: `Attendance cannot be marked after ${policy.selfMarkCutoffTime}. Ask your manager or HR.` };
  }
  return { ok: true };
}

export type Actor = 'EMPLOYEE' | 'MANAGER' | 'HR';

export interface EditRecord {
  exists: boolean;
  approved: boolean;
}

/**
 * HR can correct any day, including a day with no record yet. A manager can only edit the
 * day of one of their own reports that has not been approved yet (when the policy says so).
 */
export function canEdit(actor: Actor, record: EditRecord, opts: { managerEditsOnlyUnapproved: boolean; isDirectReport: boolean }): Check | { ok: false; code: 'NOT_ALLOWED'; message: string } {
  if (actor === 'HR') return { ok: true };
  if (actor !== 'MANAGER' || !opts.isDirectReport) return { ok: false, code: 'NOT_ALLOWED', message: 'You can only edit attendance of your own team' };
  if (!record.exists) return { ok: false, code: 'NOT_ALLOWED', message: 'There is no attendance to edit for that day. HR can add it.' };
  if (opts.managerEditsOnlyUnapproved && record.approved) return { ok: false, code: 'NOT_ALLOWED', message: 'This attendance is already approved. Only HR can change it.' };
  return { ok: true };
}

/** Statuses a manager may set by hand; the rest is derived or HR-only. */
export const MANAGER_SETTABLE = ['PRESENT', 'ABSENT', 'NOT_FOUND_PRESENT'] as const;

/* ------------------------------------------------------------------ status of a marked day */

export interface DayStatusInput {
  outcome: LateOutcome;
  /** Current status of the record, if any (late rule never changes a status that skips it). */
  currentStatusSkipsLate: boolean;
  currentStatus?: string;
  requiresApproval: boolean;
  approved: boolean;
}

/**
 * Status for a day that has punches. The late rule wins when it fires; otherwise a day that
 * still needs approval stays NOT_APPROVED, and an approved or auto-approved day is PRESENT.
 */
export function statusForMarkedDay(i: DayStatusInput): string {
  if (i.currentStatus && i.currentStatusSkipsLate) return i.currentStatus;
  if (i.outcome === 'HALF_DAY') return 'HALF_DAY';
  if (i.outcome === 'LATE') return 'LATE';
  if (i.requiresApproval && !i.approved) return 'NOT_APPROVED';
  return 'PRESENT';
}

/* ------------------------------------------------------------------ punches */

export interface PunchLike {
  punchType: 'IN' | 'OUT';
  at: Date;
}

/** Minutes between each IN and the OUT that follows it. An IN with no OUT yet adds nothing. */
export function workedMinutesFromPunches(punches: PunchLike[]): number {
  const sorted = [...punches].sort((a, b) => a.at.getTime() - b.at.getTime());
  let total = 0;
  let openIn: Date | null = null;
  for (const p of sorted) {
    if (p.punchType === 'IN') openIn = openIn ?? p.at;
    else if (openIn) {
      total += Math.max(0, Math.round((p.at.getTime() - openIn.getTime()) / 60000));
      openIn = null;
    }
  }
  return total;
}

/** What the employee's next press does: IN when there are no punches or the last one is OUT. */
export function nextPunchType(punches: PunchLike[]): 'IN' | 'OUT' {
  if (!punches.length) return 'IN';
  const sorted = [...punches].sort((a, b) => a.at.getTime() - b.at.getTime());
  const last = sorted[sorted.length - 1];
  return last.punchType === 'IN' ? 'OUT' : 'IN';
}
