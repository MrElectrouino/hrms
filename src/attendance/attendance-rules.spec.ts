import {
  canEdit,
  checkSelfMark,
  evaluateLate,
  hhmmToMinutes,
  instantFromLocal,
  localParts,
  nextPunchType,
  statusForMarkedDay,
  workedMinutesFromPunches,
} from './attendance-rules';

const at = (s: string) => new Date(s);

describe('timezone', () => {
  it('reads the local date and time of an instant', () => {
    expect(localParts(at('2026-12-01T05:30:00Z'), 'Asia/Kolkata')).toEqual({ date: '2026-12-01', minutes: 11 * 60 });
    expect(localParts(at('2026-12-01T22:30:00Z'), 'Asia/Dubai')).toEqual({ date: '2026-12-02', minutes: 2 * 60 + 30 });
  });
  it('builds an instant from a local date and time, including across daylight saving', () => {
    expect(instantFromLocal('2026-12-01', '09:00', 'Asia/Dubai').toISOString()).toBe('2026-12-01T05:00:00.000Z');
    expect(instantFromLocal('2026-12-01', '09:00', 'Asia/Kolkata').toISOString()).toBe('2026-12-01T03:30:00.000Z');
    expect(instantFromLocal('2026-07-01', '09:00', 'Europe/London').toISOString()).toBe('2026-07-01T08:00:00.000Z');
    expect(instantFromLocal('2026-12-01', '09:00', 'Europe/London').toISOString()).toBe('2026-12-01T09:00:00.000Z');
  });
});

describe('late and half-day (same thresholds as the procedures)', () => {
  const base = { startMinutes: hhmmToMinutes('09:00'), lateMinutes: 10, halfDayMinutes: 60, lateEnabled: true, halfDayEnabled: true };
  it('early, on time and inside the grace period are all on time', () => {
    expect(evaluateLate({ ...base, inMinutes: hhmmToMinutes('08:30') }).outcome).toBe('ON_TIME');
    expect(evaluateLate({ ...base, inMinutes: hhmmToMinutes('09:10') }).outcome).toBe('ON_TIME');
  });
  it('after the grace up to the half-day limit is late, beyond it is a half day', () => {
    expect(evaluateLate({ ...base, inMinutes: hhmmToMinutes('09:11') })).toEqual({ outcome: 'LATE', lateBy: 11 });
    expect(evaluateLate({ ...base, inMinutes: hhmmToMinutes('10:00') }).outcome).toBe('LATE');
    expect(evaluateLate({ ...base, inMinutes: hhmmToMinutes('10:01') }).outcome).toBe('HALF_DAY');
  });
  it('a switched-off rule falls back to the next one', () => {
    expect(evaluateLate({ ...base, lateEnabled: false, inMinutes: hhmmToMinutes('09:30') }).outcome).toBe('ON_TIME');
    expect(evaluateLate({ ...base, halfDayEnabled: false, inMinutes: hhmmToMinutes('11:00') }).outcome).toBe('LATE');
  });
});

describe('self-marking (India and UAE are two policy settings)', () => {
  const india = { allowPastDateSelfMarking: true, selfMarkCutoffTime: null };
  const uae = { allowPastDateSelfMarking: false, selfMarkCutoffTime: '11:00' };
  it('today is fine; a time limit only applies when the policy has one', () => {
    expect(checkSelfMark(india, '2026-12-01', '2026-12-01', hhmmToMinutes('15:00')).ok).toBe(true);
    expect(checkSelfMark(uae, '2026-12-01', '2026-12-01', hhmmToMinutes('10:59')).ok).toBe(true);
    expect(checkSelfMark(uae, '2026-12-01', '2026-12-01', hhmmToMinutes('11:01'))).toMatchObject({ ok: false, code: 'AFTER_CUTOFF' });
  });
  it('past days are refused unless the policy allows them; the future never is', () => {
    expect(checkSelfMark(uae, '2026-11-30', '2026-12-01', 600)).toMatchObject({ ok: false, code: 'PAST_DATE' });
    expect(checkSelfMark(india, '2026-11-30', '2026-12-01', 600).ok).toBe(true);
    expect(checkSelfMark(india, '2026-12-02', '2026-12-01', 600)).toMatchObject({ ok: false, code: 'FUTURE_DATE' });
  });
});

describe('who can edit', () => {
  const opts = { managerEditsOnlyUnapproved: true, isDirectReport: true };
  it('HR can change anything, including a day with no record', () => {
    expect(canEdit('HR', { exists: false, approved: false }, { ...opts, isDirectReport: false }).ok).toBe(true);
    expect(canEdit('HR', { exists: true, approved: true }, opts).ok).toBe(true);
  });
  it('a manager can edit an unapproved day of their own team only', () => {
    expect(canEdit('MANAGER', { exists: true, approved: false }, opts).ok).toBe(true);
    expect(canEdit('MANAGER', { exists: true, approved: true }, opts)).toMatchObject({ ok: false });
    expect(canEdit('MANAGER', { exists: false, approved: false }, opts)).toMatchObject({ ok: false });
    expect(canEdit('MANAGER', { exists: true, approved: false }, { ...opts, isDirectReport: false })).toMatchObject({ ok: false });
  });
  it('the policy can let managers change approved days too', () => {
    expect(canEdit('MANAGER', { exists: true, approved: true }, { ...opts, managerEditsOnlyUnapproved: false }).ok).toBe(true);
  });
});

describe('status of a marked day', () => {
  const base = { outcome: 'ON_TIME' as const, currentStatusSkipsLate: false, requiresApproval: true, approved: false };
  it('late and half day win; otherwise it waits for approval, then is present', () => {
    expect(statusForMarkedDay({ ...base, outcome: 'LATE' })).toBe('LATE');
    expect(statusForMarkedDay({ ...base, outcome: 'HALF_DAY' })).toBe('HALF_DAY');
    expect(statusForMarkedDay(base)).toBe('NOT_APPROVED');
    expect(statusForMarkedDay({ ...base, approved: true })).toBe('PRESENT');
    expect(statusForMarkedDay({ ...base, requiresApproval: false })).toBe('PRESENT');
  });
  it('a status that skips the late rule (absent, holiday, half day...) is never changed by it', () => {
    expect(statusForMarkedDay({ ...base, outcome: 'LATE', currentStatus: 'ABSENT', currentStatusSkipsLate: true })).toBe('ABSENT');
    expect(statusForMarkedDay({ ...base, outcome: 'LATE', currentStatus: 'HALF_DAY', currentStatusSkipsLate: true })).toBe('HALF_DAY');
  });
});

describe('punches', () => {
  it('alternates IN and OUT and adds up each session', () => {
    expect(nextPunchType([])).toBe('IN');
    const p = [
      { punchType: 'IN' as const, at: at('2026-12-01T03:30:00Z') },
      { punchType: 'OUT' as const, at: at('2026-12-01T07:30:00Z') },
      { punchType: 'IN' as const, at: at('2026-12-01T08:30:00Z') },
    ];
    expect(nextPunchType(p)).toBe('OUT');
    expect(workedMinutesFromPunches(p)).toBe(240);
    expect(workedMinutesFromPunches([...p, { punchType: 'OUT' as const, at: at('2026-12-01T12:30:00Z') }])).toBe(480);
  });
});
