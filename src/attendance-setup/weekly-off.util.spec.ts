import { describeDays, describeTemplate, isWeeklyOffDay, occurrenceInMonth, validateTemplate, WeeklyOffRule } from './weekly-off.util';

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe('weekly off days', () => {
  it('lists days in week order starting Monday', () => {
    expect(describeDays([0, 6])).toBe('Saturday, Sunday');
    expect(describeDays([6, 5])).toBe('Friday, Saturday');
    expect(describeDays([0])).toBe('Sunday');
  });

  it('every-week days are off every week', () => {
    const t = { days: [0, 6], rules: [] };
    expect(isWeeklyOffDay(t, d('2026-11-14'))).toBe(true); // Saturday
    expect(isWeeklyOffDay(t, d('2026-11-15'))).toBe(true); // Sunday
    expect(isWeeklyOffDay(t, d('2026-11-16'))).toBe(false); // Monday
  });
});

describe('occurrence in the month', () => {
  it('counts which Saturday of the month it is, and the last one', () => {
    // November 2026: Saturdays are 7, 14, 21, 28
    expect(occurrenceInMonth(d('2026-11-07'))).toEqual({ nth: 1, isLast: false });
    expect(occurrenceInMonth(d('2026-11-14'))).toEqual({ nth: 2, isLast: false });
    expect(occurrenceInMonth(d('2026-11-28'))).toEqual({ nth: 4, isLast: true });
    // October 2026 has five Saturdays: 3, 10, 17, 24, 31
    expect(occurrenceInMonth(d('2026-10-31'))).toEqual({ nth: 5, isLast: true });
    expect(occurrenceInMonth(d('2026-10-24'))).toEqual({ nth: 4, isLast: false });
  });
});

describe('weekdays that are off only some weeks', () => {
  const second4th: WeeklyOffRule[] = [{ day: 6, kind: 'WEEKS', weeks: [2, 4] }];

  it('2nd and 4th Saturday, plus every Sunday', () => {
    const t = { days: [0], rules: second4th };
    const sat = (s: string) => isWeeklyOffDay(t, d(s));
    expect(sat('2026-11-07')).toBe(false); // 1st Saturday works
    expect(sat('2026-11-14')).toBe(true); // 2nd off
    expect(sat('2026-11-21')).toBe(false); // 3rd works
    expect(sat('2026-11-28')).toBe(true); // 4th off
    expect(sat('2026-10-31')).toBe(false); // 5th works
    expect(isWeeklyOffDay(t, d('2026-11-15'))).toBe(true); // Sunday
  });

  it('1st and 3rd, and the last Saturday', () => {
    expect(isWeeklyOffDay({ days: [], rules: [{ day: 6, kind: 'WEEKS', weeks: [1, 3] }] }, d('2026-11-21'))).toBe(true);
    const last = { days: [], rules: [{ day: 6, kind: 'WEEKS', weeks: [-1] } as WeeklyOffRule] };
    expect(isWeeklyOffDay(last, d('2026-10-31'))).toBe(true); // 5th and last
    expect(isWeeklyOffDay(last, d('2026-10-24'))).toBe(false);
    expect(isWeeklyOffDay(last, d('2026-11-28'))).toBe(true); // 4th and last
  });

  it('alternate Saturdays from a chosen date, before and after it', () => {
    const t = { days: [], rules: [{ day: 6, kind: 'ALTERNATE', anchor: '2026-11-07' } as WeeklyOffRule] };
    expect(isWeeklyOffDay(t, d('2026-11-07'))).toBe(true);
    expect(isWeeklyOffDay(t, d('2026-11-14'))).toBe(false);
    expect(isWeeklyOffDay(t, d('2026-11-21'))).toBe(true);
    expect(isWeeklyOffDay(t, d('2026-12-05'))).toBe(true); // 4 weeks later
    expect(isWeeklyOffDay(t, d('2026-10-24'))).toBe(true); // 2 weeks before
    expect(isWeeklyOffDay(t, d('2026-10-31'))).toBe(false);
  });

  it('is described in words', () => {
    expect(describeTemplate({ days: [0], rules: second4th })).toBe('Saturday (2nd, 4th); Sunday');
    expect(describeTemplate({ days: [], rules: [{ day: 6, kind: 'WEEKS', weeks: [-1, 1] }] })).toBe('Saturday (1st, last)');
    expect(describeTemplate({ days: [], rules: [{ day: 6, kind: 'ALTERNATE', anchor: '2026-11-07' }] })).toBe('Saturday (every other week from 2026-11-07)');
  });
});

describe('validating a template', () => {
  it('accepts plain days and sensible rules', () => {
    expect(validateTemplate([0, 6])).toEqual([]);
    expect(validateTemplate([0], [{ day: 6, kind: 'WEEKS', weeks: [2, 4] }])).toEqual([]);
    expect(validateTemplate([], [{ day: 6, kind: 'ALTERNATE', anchor: '2026-11-07' }])).toEqual([]);
  });
  it('needs a day off, valid weekdays, no repeats and one working day', () => {
    expect(validateTemplate([])[0]).toMatch(/at least one day off/);
    expect(validateTemplate([7])[0]).toMatch(/Sunday to Saturday/);
    expect(validateTemplate([1, 1])[0]).toMatch(/twice/);
    expect(validateTemplate([0, 1, 2, 3, 4, 5, 6])[0]).toMatch(/working day/);
  });
  it('rejects rules that do not make sense', () => {
    expect(validateTemplate([6], [{ day: 6, kind: 'WEEKS', weeks: [2] }])[0]).toMatch(/already off every week/);
    expect(validateTemplate([], [{ day: 6, kind: 'WEEKS', weeks: [] }])[0]).toMatch(/at least one week/);
    expect(validateTemplate([], [{ day: 6, kind: 'WEEKS', weeks: [6] }])[0]).toMatch(/1st to 5th or last/);
    expect(validateTemplate([], [{ day: 6, kind: 'ALTERNATE', anchor: '2026-11-08' }])[0]).toMatch(/must fall on a Saturday/);
    expect(validateTemplate([], [{ day: 6, kind: 'ALTERNATE', anchor: 'soon' }])[0]).toMatch(/real date/);
    expect(validateTemplate([], [{ day: 6, kind: 'WEEKS', weeks: [1] }, { day: 6, kind: 'WEEKS', weeks: [2] }])[0]).toMatch(/more than one rule/);
  });
});
