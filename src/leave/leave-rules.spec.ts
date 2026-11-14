import { allocateFefo, compOffExpiry, countLeaveDays, leaveYear, monthlyCredit, DayKind, TimelineDay } from './leave-rules';

// 2026-12-04 is a Friday. Saturday and Sunday are weekly offs.
const week = (extra: Record<string, DayKind> = {}): TimelineDay[] => {
  const out: TimelineDay[] = [];
  for (let d = Date.parse('2026-11-23T00:00:00Z'); d <= Date.parse('2026-12-20T00:00:00Z'); d += 86_400_000) {
    const date = new Date(d).toISOString().slice(0, 10);
    const dow = new Date(d).getUTCDay();
    out.push({ date, kind: extra[date] ?? (dow === 0 || dow === 6 ? 'WEEKLY_OFF' : 'WORKING') });
  }
  return out;
};
const on = { enabled: true, typeEligible: true, weeklyOffs: true, holidays: true, requireBothSides: false };

describe('counting leave days', () => {
  it('counts working days only when the sandwich rule is off', () => {
    const r = countLeaveDays(week(), '2026-12-04', '2026-12-07', false, { ...on, enabled: false });
    expect(r).toMatchObject({ requestedDays: 2, sandwichDays: 0, totalDays: 2 });
  });

  it('the plan example: Friday to Monday with the rule on is 4 days, with the type not eligible it is 2', () => {
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-07', false, on)).toMatchObject({ requestedDays: 2, sandwichDays: 2, totalDays: 4 });
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-07', false, { ...on, typeEligible: false })).toMatchObject({ totalDays: 2 });
  });

  it('India style: leave on one side of the weekend is enough', () => {
    // Friday only, weekend after it
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-04', false, on)).toMatchObject({ requestedDays: 1, sandwichDays: 2, totalDays: 3 });
    // Monday only, weekend before it
    expect(countLeaveDays(week(), '2026-12-07', '2026-12-07', false, on)).toMatchObject({ sandwichDays: 2, totalDays: 3 });
  });

  it('both sides required: a lone Friday adds nothing, but Friday plus an existing Monday leave does', () => {
    const both = { ...on, requireBothSides: true };
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-04', false, both)).toMatchObject({ sandwichDays: 0, totalDays: 1 });
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-04', false, both, new Set(['2026-12-07']))).toMatchObject({ sandwichDays: 2, totalDays: 3 });
  });

  it('holidays and weekly offs can be switched on separately', () => {
    const t = week({ '2026-12-07': 'HOLIDAY' }); // Mon holiday after the weekend
    const r = countLeaveDays(t, '2026-12-04', '2026-12-04', false, { ...on, holidays: false });
    expect(r.sandwichDays).toBe(2); // Sat, Sun counted; the holiday is not
    expect(countLeaveDays(t, '2026-12-04', '2026-12-04', false, on).sandwichDays).toBe(3); // Sat, Sun and the holiday
  });

  it('a half day counts 0.5 and does not trigger the rule', () => {
    expect(countLeaveDays(week(), '2026-12-04', '2026-12-04', true, on)).toMatchObject({ requestedDays: 0.5, sandwichDays: 0, totalDays: 0.5 });
  });

  it('leave in the middle of a week is not sandwiched', () => {
    expect(countLeaveDays(week(), '2026-12-09', '2026-12-10', false, on)).toMatchObject({ sandwichDays: 0, totalDays: 2 });
  });

  it('keeps a record of why every day was counted', () => {
    const r = countLeaveDays(week(), '2026-12-04', '2026-12-04', false, on);
    expect(r.days.map((d) => `${d.date}:${d.reason}`)).toEqual(['2026-12-04:LEAVE', '2026-12-05:SANDWICH_WEEKLY_OFF', '2026-12-06:SANDWICH_WEEKLY_OFF']);
  });
});

describe('balance buckets', () => {
  const buckets = [
    { id: 1, remaining: 1, expiresOn: '2027-03-01' },
    { id: 2, remaining: 2, expiresOn: '2027-01-15' },
    { id: 3, remaining: 5, expiresOn: null },
  ];
  it('takes from the earliest expiring bucket first, and never-expiring buckets last', () => {
    expect(allocateFefo(buckets, 2.5)).toEqual({ allocations: [{ creditId: 2, days: 2 }, { creditId: 1, days: 0.5 }], shortfall: 0 });
    expect(allocateFefo(buckets, 4)).toEqual({ allocations: [{ creditId: 2, days: 2 }, { creditId: 1, days: 1 }, { creditId: 3, days: 1 }], shortfall: 0 });
  });
  it('reports what the balance cannot cover', () => {
    expect(allocateFefo(buckets, 10).shortfall).toBe(2);
  });
});

describe('leave year and accrual', () => {
  it('a January year and an April to March year', () => {
    expect(leaveYear('2026-12-04', 1)).toEqual({ start: '2026-01-01', end: '2026-12-31', label: '2026' });
    expect(leaveYear('2026-12-04', 4)).toEqual({ start: '2026-04-01', end: '2027-03-31', label: '2026-27' });
    expect(leaveYear('2027-02-10', 4)).toEqual({ start: '2026-04-01', end: '2027-03-31', label: '2026-27' });
  });
  it('monthly credit and comp off expiry', () => {
    expect(monthlyCredit(12)).toBe(1);
    expect(monthlyCredit(24)).toBe(2);
    expect(compOffExpiry('2026-12-01', 90)).toBe('2027-03-01');
    expect(compOffExpiry('2026-12-01', null)).toBeNull();
  });
});
