import { evaluateHours, expectation, flexibleLate, statusAfterHours, statusForUnmarkedDay, statusWhenHoursOk } from './hours-rules';

const base = { breakMinutes: 60, breakAfterMinutes: 300, requiredMinutes: 480, shortEnabled: true, shortGraceMinutes: 0, overtimeEnabled: false, overtimeAfterMinutes: 0 };

describe('hours worked (the examples from the plan)', () => {
  it('takes the break off, then compares with the required hours', () => {
    // 07:30 to 16:30 with a one-hour break is 8 hours: completed
    expect(evaluateHours({ ...base, grossMinutes: 540 })).toMatchObject({ netMinutes: 480, isShort: false, shortMinutes: 0 });
    // 09:30 to 17:00 is 7.5 hours gross, 6.5 net: short by 1.5 hours
    expect(evaluateHours({ ...base, grossMinutes: 450 })).toMatchObject({ netMinutes: 390, isShort: true, shortMinutes: 90 });
  });
  it('a short day inside the grace is not short', () => {
    expect(evaluateHours({ ...base, grossMinutes: 535, shortGraceMinutes: 10 }).isShort).toBe(false);
    expect(evaluateHours({ ...base, grossMinutes: 520, shortGraceMinutes: 10 }).isShort).toBe(true);
  });
  it('the break is only taken off when enough time was worked', () => {
    expect(evaluateHours({ ...base, grossMinutes: 240 }).netMinutes).toBe(240);
  });
  it('overtime is the time beyond the requirement and beyond the overtime threshold, only when switched on', () => {
    const r = { ...base, grossMinutes: 660, overtimeEnabled: true, overtimeAfterMinutes: 30 };
    expect(evaluateHours(r).overtimeMinutes).toBe(90);
    expect(evaluateHours({ ...r, overtimeEnabled: false }).overtimeMinutes).toBe(0);
    expect(evaluateHours({ ...r, grossMinutes: 560 }).overtimeMinutes).toBe(0);
  });
  it('with no requirement nothing can be short or over', () => {
    expect(evaluateHours({ ...base, requiredMinutes: null, grossMinutes: 600, overtimeEnabled: true })).toMatchObject({ isShort: false, overtimeMinutes: 0 });
  });
});

describe('flexible start window', () => {
  it('no window means nothing is late; a window makes only the latest start matter', () => {
    expect(flexibleLate(11 * 60, null)).toEqual({ late: false, lateBy: 0 });
    expect(flexibleLate(9 * 60 + 45, '10:00')).toEqual({ late: false, lateBy: 0 });
    expect(flexibleLate(10 * 60 + 20, '10:00')).toEqual({ late: true, lateBy: 20 });
  });
});

describe('status after the hours are known', () => {
  it('only an otherwise fine day becomes short hours, and it can go back', () => {
    expect(statusAfterHours('PRESENT', true, false)).toBe('SHORT_HOURS');
    expect(statusAfterHours('NOT_APPROVED', true, false)).toBe('SHORT_HOURS');
    expect(statusAfterHours('LATE', true, false)).toBe('LATE');
    expect(statusAfterHours('ABSENT', true, true)).toBe('ABSENT');
    expect(statusAfterHours('PRESENT', false, false)).toBe('PRESENT');
    expect(statusWhenHoursOk('SHORT_HOURS', true)).toBe('NOT_APPROVED');
    expect(statusWhenHoursOk('SHORT_HOURS', false)).toBe('PRESENT');
  });
});

describe('days nobody marked', () => {
  const day = { isHoliday: false, rosterSource: 'PATTERN' as const, isWeeklyOff: false };
  it('is absent only when the roster says the person should have worked', () => {
    expect(statusForUnmarkedDay(expectation(day), false)).toBe('ABSENT');
    expect(statusForUnmarkedDay(expectation({ ...day, isWeeklyOff: true }), false)).toBe('WEEKLY_OFF');
    expect(statusForUnmarkedDay(expectation({ ...day, isHoliday: true }), false)).toBe('HOLIDAY');
  });
  it('approved leave beats absent but a holiday stays a holiday', () => {
    expect(statusForUnmarkedDay(expectation(day), true)).toBe('ON_LEAVE');
    expect(statusForUnmarkedDay(expectation({ ...day, isHoliday: true }), true)).toBe('HOLIDAY');
  });
  it('with no roster nothing is guessed', () => {
    expect(statusForUnmarkedDay(expectation({ isHoliday: false, rosterSource: 'NONE', isWeeklyOff: false }), false)).toBeNull();
  });
});
