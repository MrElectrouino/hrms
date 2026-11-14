import { EntitlementInput, annualForService, completedMonths, entitlementForYear, milestoneDate, pickPolicy, roundDays, validateSlabs } from './entitlement-rules';

const base: EntitlementInput = { annualDays: 24, yearStart: '2026-01-01', serviceStart: '2026-07-01', joinDate: '2026-07-01', method: 'COMPLETED_MONTHS', rounding: 'NONE' };
const q = (o: Partial<EntitlementInput>) => entitlementForYear({ ...base, ...o });

describe('roundDays', () => {
  it('handles every mode on 11.11', () => {
    expect(roundDays(11.11, 'NONE')).toBe(11.11);
    expect(roundDays(11.11, 'DOWN')).toBe(11);
    expect(roundDays(11.11, 'UP')).toBe(12);
    expect(roundDays(11.11, 'NEAREST')).toBe(11);
    expect(roundDays(11.11, 'NEAREST_HALF')).toBe(11);
    expect(roundDays(11.11, 'UP_HALF')).toBe(11.5);
    expect(roundDays(11.11, 'DOWN_HALF')).toBe(11);
  });
  it('midpoints follow the tie rule', () => {
    expect(roundDays(10.5, 'NEAREST')).toBe(11);
    expect(roundDays(10.5, 'NEAREST', 'DOWN')).toBe(10);
    expect(roundDays(10.75, 'NEAREST_HALF')).toBe(11);
    expect(roundDays(10.75, 'NEAREST_HALF', 'DOWN')).toBe(10.5);
  });
  it('leaves exact values alone', () => {
    expect(roundDays(12, 'UP')).toBe(12);
    expect(roundDays(12.5, 'UP_HALF')).toBe(12.5);
    expect(roundDays(12.5, 'DOWN_HALF')).toBe(12.5);
  });
});

describe('dates', () => {
  it('counts completed months', () => {
    expect(completedMonths('2021-03-01', '2026-02-28')).toBe(59);
    expect(completedMonths('2021-03-01', '2026-03-01')).toBe(60);
    expect(completedMonths('2026-01-31', '2026-02-28')).toBe(1);
    expect(milestoneDate('2021-03-01', 60)).toBe('2026-03-01');
  });
});

describe('proration for a joiner on 1 July (24 days, calendar year)', () => {
  it('completed, started and exact days', () => {
    expect(q({}).quantity).toBe(12);
    expect(q({ method: 'STARTED_MONTHS' }).quantity).toBe(12);
    expect(q({ method: 'EXACT_DAYS' }).raw).toBeCloseTo(12.0986, 3);
  });
  it('no proration gives the full year', () => {
    expect(q({ method: 'NONE' }).quantity).toBe(24);
  });
});

describe('proration for a joiner on 16 July', () => {
  const join = { joinDate: '2026-07-16', serviceStart: '2026-07-16' };
  it('completed months leaves out July', () => expect(q({ ...join }).quantity).toBe(10));
  it('started months counts July', () => expect(q({ ...join, method: 'STARTED_MONTHS' }).quantity).toBe(12));
  it('exact days is 169 of 365', () => {
    const r = q({ ...join, method: 'EXACT_DAYS' });
    expect(r.raw).toBeCloseTo(11.1123, 3);
    expect(q({ ...join, method: 'EXACT_DAYS', rounding: 'UP_HALF' }).quantity).toBe(11.5);
  });
  it('the cutoff rule decides the joining month', () => {
    expect(q({ ...join, method: 'CUTOFF_DAY', cutoffDay: 15 }).quantity).toBe(10);
    expect(q({ ...join, method: 'CUTOFF_DAY', cutoffDay: 20 }).quantity).toBe(12);
  });
  it('a leap year changes the exact-days figure', () => {
    const r = entitlementForYear({ ...base, ...join, method: 'EXACT_DAYS', yearStart: '2028-01-01', joinDate: '2028-07-16', serviceStart: '2028-07-16' });
    expect(r.raw).toBeCloseTo((24 * 169) / 366, 3);
  });
});

describe('financial year starting in April', () => {
  it('a 1 July joiner gets 9 months', () => {
    expect(q({ yearStart: '2026-04-01' }).quantity).toBe(18);
  });
});

describe('leaving part-way', () => {
  it('stops at the exit date', () => {
    expect(q({ joinDate: '2020-01-01', serviceStart: '2020-01-01', exitDate: '2026-09-30', method: 'COMPLETED_MONTHS' }).quantity).toBe(18);
    expect(q({ joinDate: '2020-01-01', serviceStart: '2020-01-01', exitDate: '2026-09-15', method: 'COMPLETED_MONTHS' }).quantity).toBe(16);
  });
  it('a joiner who leaves in the same year', () => {
    expect(q({ exitDate: '2026-09-30' }).quantity).toBe(6);
  });
});

describe('minimum and maximum', () => {
  it('applies after rounding', () => {
    expect(q({ joinDate: '2026-12-31', serviceStart: '2026-12-31', minDays: 1 }).quantity).toBe(1);
    expect(q({ method: 'NONE', maxDays: 20 }).quantity).toBe(20);
  });
});

describe('service slabs', () => {
  const slabs = [
    { fromMonths: 0, toMonths: 60, annualDays: 21 },
    { fromMonths: 60, toMonths: 120, annualDays: 30 },
    { fromMonths: 120, toMonths: null, annualDays: 35 },
  ];
  const veteran = { joinDate: '2021-03-01', serviceStart: '2021-03-01', slabs, method: 'NONE' as const };
  it('looks up the slab by completed months', () => {
    expect(annualForService(slabs, 59, 0)).toBe(21);
    expect(annualForService(slabs, 60, 0)).toBe(30);
    expect(annualForService(slabs, 200, 0)).toBe(35);
  });
  it('crossing the milestone mid-year, applied immediately, adds up per month', () => {
    expect(q({ ...veteran }).quantity).toBe(28.5);
  });
  it('applied from the next year keeps the old slab for the whole year', () => {
    expect(q({ ...veteran, slabTiming: 'NEXT_YEAR' }).quantity).toBe(21);
    expect(q({ ...veteran, slabTiming: 'NEXT_YEAR', yearStart: '2027-01-01' }).quantity).toBe(30);
  });
  it('exact days splits a milestone that falls inside a month', () => {
    const r = q({ ...veteran, serviceStart: '2021-03-16', joinDate: '2021-03-16', method: 'EXACT_DAYS' });
    expect(r.raw).toBeCloseTo((21 * 74 + 30 * 291) / 365, 3);
  });
  it('rejects bad slabs', () => {
    expect(validateSlabs(slabs)).toEqual([]);
    expect(validateSlabs([{ fromMonths: 0, toMonths: 60, annualDays: 21 }, { fromMonths: 48, toMonths: null, annualDays: 30 }]).join()).toMatch(/overlap/);
    expect(validateSlabs([{ fromMonths: 0, toMonths: 12, annualDays: 21 }, { fromMonths: 24, toMonths: null, annualDays: 30 }]).join()).toMatch(/gap/);
    expect(validateSlabs([{ fromMonths: 6, toMonths: null, annualDays: 21 }]).join()).toMatch(/start at 0/);
  });
});

describe('choosing the policy', () => {
  const who = { employeeId: 7, countryCode: 'AE', branchId: 3, employmentTypeId: 2 };
  const p = (id: number, scope: object, from = '2026-01-01', to: string | null = null, priority = 0) => ({ id, scope, effectiveFrom: from, effectiveTo: to, priority });
  it('prefers the most specific scope', () => {
    const list = [p(1, {}), p(2, { countryCode: 'AE' }), p(3, { countryCode: 'AE', employmentTypeId: 2 }), p(4, { countryCode: 'IN' })];
    expect(pickPolicy(list, who, '2026-06-01')?.id).toBe(3);
  });
  it('an employee override beats everything', () => {
    expect(pickPolicy([p(1, { branchId: 3 }), p(2, { employeeId: 7 })], who, '2026-06-01')?.id).toBe(2);
    expect(pickPolicy([p(2, { employeeId: 9 })], who, '2026-06-01')).toBeNull();
  });
  it('respects effective dates', () => {
    const list = [p(1, { countryCode: 'AE' }, '2026-01-01', '2026-06-30'), p(2, { countryCode: 'AE' }, '2026-07-01')];
    expect(pickPolicy(list, who, '2026-06-30')?.id).toBe(1);
    expect(pickPolicy(list, who, '2026-07-01')?.id).toBe(2);
    expect(pickPolicy(list, who, '2025-12-31')).toBeNull();
  });
});
