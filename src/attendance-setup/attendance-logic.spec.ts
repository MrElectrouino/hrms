import {
  cycleIndex,
  netWorkedMinutes,
  parseHolidayOrder,
  parseIsoDate,
  pickGroupAssignment,
  resolveCalendarTarget,
  pickHolidayCalendar,
  validateHolidayRows,
  validateRosterRows,
  validateSchedule,
  minutesBetween,
} from './attendance-logic';

describe('holiday calendar order', () => {
  it('defaults to employee, site, branch, country, company', () => {
    expect(parseHolidayOrder(null)).toEqual(['EMPLOYEE', 'SITE', 'BRANCH', 'COUNTRY', 'COMPANY']);
  });

  it('keeps a custom order and appends anything missing', () => {
    expect(parseHolidayOrder('["COUNTRY","COMPANY"]')).toEqual(['COUNTRY', 'COMPANY', 'EMPLOYEE', 'SITE', 'BRANCH']);
  });

  it('an order saved before sites existed gets the site level just before the branch level', () => {
    expect(parseHolidayOrder('["EMPLOYEE","BRANCH","COUNTRY","COMPANY"]')).toEqual(['EMPLOYEE', 'SITE', 'BRANCH', 'COUNTRY', 'COMPANY']);
  });

  it('drops repeated and unknown entries, and a bad value falls back to the default', () => {
    expect(parseHolidayOrder('["COMPANY","COMPANY","BOGUS","BRANCH"]')).toEqual(['COMPANY', 'SITE', 'BRANCH', 'EMPLOYEE', 'COUNTRY']);
    expect(parseHolidayOrder('not json')).toEqual(['EMPLOYEE', 'SITE', 'BRANCH', 'COUNTRY', 'COMPANY']);
  });

  it('the first level that has a calendar wins, so changing the order changes the result', () => {
    const byLevel = { BRANCH: 11, COUNTRY: 22, COMPANY: 33 };
    expect(pickHolidayCalendar(['EMPLOYEE', 'BRANCH', 'COUNTRY', 'COMPANY'], byLevel)).toEqual({ level: 'BRANCH', calendarId: 11 });
    expect(pickHolidayCalendar(['COUNTRY', 'BRANCH', 'EMPLOYEE', 'COMPANY'], byLevel)).toEqual({ level: 'COUNTRY', calendarId: 22 });
    expect(pickHolidayCalendar(['EMPLOYEE', 'BRANCH'], {})).toBeNull();
  });
});

describe('roster cycle', () => {
  const anchor = parseIsoDate('2026-12-01')!;
  it('counts days within a cycle, including dates before the anchor', () => {
    expect(cycleIndex(anchor, parseIsoDate('2026-12-01')!, 7)).toBe(0);
    expect(cycleIndex(anchor, parseIsoDate('2026-12-08')!, 7)).toBe(0);
    expect(cycleIndex(anchor, parseIsoDate('2026-12-10')!, 7)).toBe(2);
    expect(cycleIndex(anchor, parseIsoDate('2026-11-30')!, 7)).toBe(6);
    expect(cycleIndex(anchor, parseIsoDate('2026-12-15')!, 14)).toBe(0);
  });
});

describe('break deduction', () => {
  it('deducts the break only when enough time was worked', () => {
    expect(netWorkedMinutes(540, 60, 300)).toBe(480);
    expect(netWorkedMinutes(240, 60, 300)).toBe(240);
    expect(netWorkedMinutes(540, 0, 0)).toBe(540);
    expect(netWorkedMinutes(30, 60, 0)).toBe(0);
  });
  it('handles overnight spans', () => {
    expect(minutesBetween('09:00', '18:00')).toBe(540);
    expect(minutesBetween('22:00', '06:00')).toBe(480);
  });
});

describe('work schedule validation', () => {
  it('accepts a fixed schedule and a flexible one with or without a start window', () => {
    expect(validateSchedule({ scheduleType: 'FIXED', startTime: '09:00', endTime: '18:00', requiredDailyMinutes: 480, breakMinutes: 60, breakAfterMinutes: 300 })).toEqual([]);
    expect(validateSchedule({ scheduleType: 'FLEXIBLE', requiredDailyMinutes: 480 })).toEqual([]);
    expect(validateSchedule({ scheduleType: 'FLEXIBLE', requiredDailyMinutes: 480, earliestStartTime: '07:00', latestStartTime: '10:00' })).toEqual([]);
  });
  it('rejects half a window, a backwards window, and missing fixed times', () => {
    expect(validateSchedule({ scheduleType: 'FLEXIBLE', requiredDailyMinutes: 480, earliestStartTime: '07:00' })[0]).toMatch(/both/);
    expect(validateSchedule({ scheduleType: 'FLEXIBLE', requiredDailyMinutes: 480, earliestStartTime: '10:00', latestStartTime: '07:00' })[0]).toMatch(/before/);
    expect(validateSchedule({ scheduleType: 'FIXED', requiredDailyMinutes: 480 })[0]).toMatch(/start and end/);
  });
});

describe('holiday import rows', () => {
  it('keeps valid rows and reports each bad row separately', () => {
    const r = validateHolidayRows([
      { row: 2, date: '2026-01-26', name: 'Republic Day', type: null },
      { row: 3, date: '2026-13-40', name: 'Broken', type: null },
      { row: 4, date: '2026-01-26', name: 'Again', type: 'public' },
      { row: 5, date: '2026-08-15', name: '', type: null },
      { row: 6, date: '2026-10-02', name: 'Gandhi Jayanti', type: 'BOGUS' },
    ]);
    expect(r.valid.map((x) => x.row)).toEqual([2]);
    expect(r.valid[0].holidayType).toBe('PUBLIC');
    expect(r.errors.map((e) => e.row)).toEqual([3, 4, 5, 6]);
    expect(r.errors[1].message).toMatch(/Duplicate/);
  });
});

describe('roster import rows', () => {
  const employees = new Map([['EMP-0001', 1], ['EMP-0002', 2]]);
  const shifts = new Map([['morning', 10], ['night', 11]]);
  it('imports the valid rows and lists the others (partial import)', () => {
    const r = validateRosterRows(
      [
        { row: 2, employeeCode: 'emp-0001', date: '2026-12-01', shift: 'Morning' },
        { row: 3, employeeCode: 'EMP-0001', date: '2026-12-02', shift: 'off' },
        { row: 4, employeeCode: 'EMP-9999', date: '2026-12-02', shift: 'Morning' },
        { row: 5, employeeCode: 'EMP-0002', date: '2026-12-02', shift: 'Midnight' },
        { row: 6, employeeCode: 'EMP-0001', date: '2026-12-01', shift: 'Night' },
      ],
      employees,
      shifts,
    );
    expect(r.valid).toEqual([
      { row: 2, employeeId: 1, date: '2026-12-01', shiftId: 10, isWeeklyOff: false },
      { row: 3, employeeId: 1, date: '2026-12-02', shiftId: null, isWeeklyOff: true },
    ]);
    expect(r.errors.map((e) => e.row)).toEqual([4, 5, 6]);
    expect(r.errors[2].message).toMatch(/Duplicate/);
  });
});

describe('holidays that last several days', () => {
  const row = (n: number, date: string, endDate: string | null) => ({ row: n, date, name: 'Eid', type: null, endDate });
  it('accepts an end date on or after the date', () => {
    const r = validateHolidayRows([row(2, '2026-03-20', '2026-03-22'), row(3, '2026-04-01', '2026-04-01'), row(4, '2026-05-01', null)]);
    expect(r.errors).toEqual([]);
    expect(r.valid.map((v) => v.endDate)).toEqual(['2026-03-22', null, null]);
  });
  it('rejects an end date before the date, a bad end date and a very long holiday', () => {
    const r = validateHolidayRows([row(2, '2026-03-20', '2026-03-19'), row(3, '2026-03-20', 'soon'), row(4, '2026-01-01', '2026-03-01')]);
    expect(r.errors.map((e) => e.message)).toEqual([
      expect.stringMatching(/before the date/),
      expect.stringMatching(/real date/),
      expect.stringMatching(/at most 31 days/),
    ]);
  });
});

describe('pickGroupAssignment', () => {
  const d = (s: string) => new Date(s + 'T00:00:00Z');
  const mk = (scope: string, extra: Record<string, unknown> = {}) => ({ scope, countryCode: null as string | null, branchId: null as number | null, effectiveFrom: d('2026-01-01'), effectiveTo: null as Date | null, ...extra });
  const who = { branchId: 5, country: 'AE' };

  it('prefers the branch, then the country, then the company', () => {
    const branch = mk('BRANCH', { branchId: 5 });
    const country = mk('COUNTRY', { countryCode: 'AE' });
    const company = mk('COMPANY');
    expect(pickGroupAssignment([company, country, branch], who, d('2026-06-01'))).toBe(branch);
    expect(pickGroupAssignment([company, country], who, d('2026-06-01'))).toBe(country);
    expect(pickGroupAssignment([company], who, d('2026-06-01'))).toBe(company);
  });

  it('a site beats its branch', () => {
    const site = mk('SITE', { siteId: 3 });
    const branch = mk('BRANCH', { branchId: 5 });
    expect(pickGroupAssignment([branch, site], { ...who, siteId: 3 }, d('2026-06-01'))).toBe(site);
    expect(pickGroupAssignment([branch, site], { ...who, siteId: 4 }, d('2026-06-01'))).toBe(branch);
    expect(pickGroupAssignment([branch, site], who, d('2026-06-01'))).toBe(branch);
  });

  it('ignores other branches and countries', () => {
    expect(pickGroupAssignment([mk('BRANCH', { branchId: 9 }), mk('COUNTRY', { countryCode: 'IN' })], who, d('2026-06-01'))).toBeNull();
  });

  it('respects the dates', () => {
    const ended = mk('COMPANY', { effectiveTo: d('2026-03-31') });
    const later = mk('COMPANY', { effectiveFrom: d('2026-07-01') });
    expect(pickGroupAssignment([ended, later], who, d('2026-06-01'))).toBeNull();
    expect(pickGroupAssignment([ended, later], who, d('2026-03-31'))).toBe(ended);
    expect(pickGroupAssignment([ended, later], who, d('2026-07-01'))).toBe(later);
  });

  it('a branch assignment that has ended falls back to the next level', () => {
    const branch = mk('BRANCH', { branchId: 5, effectiveTo: d('2026-02-28') });
    const company = mk('COMPANY');
    expect(pickGroupAssignment([branch, company], who, d('2026-06-01'))).toBe(company);
  });
});

describe('resolveCalendarTarget (Applies to / Value columns of the holiday import)', () => {
  const lists = {
    countries: [{ isoCode: 'IN', name: 'India' }, { isoCode: 'AE', name: 'United Arab Emirates' }],
    branches: [{ id: 1, name: 'Pune HQ', code: 'PUN' }, { id: 2, name: 'Dubai Office', code: 'DXB' }],
    sites: [{ id: 7, name: 'Plant 1' }],
  };
  const r = (a: string | null, v: string | null) => resolveCalendarTarget(a, v, lists);

  it('both empty means the calendar chosen on screen', () => {
    expect(r(null, null)).toEqual({ target: null });
    expect(r('', '  ')).toEqual({ target: null });
  });
  it('Company needs no value', () => {
    expect(r('Company', null).target).toMatchObject({ scope: 'COMPANY' });
  });
  it('finds a branch by name or code, ignoring case', () => {
    expect(r('branch', 'pune hq').target).toMatchObject({ scope: 'BRANCH', branchId: 1 });
    expect(r('Branch', 'DXB').target).toMatchObject({ scope: 'BRANCH', branchId: 2 });
  });
  it('finds a country by name or code, and a site by name', () => {
    expect(r('Country', 'India').target).toMatchObject({ scope: 'COUNTRY', countryCode: 'IN' });
    expect(r('COUNTRY', 'ae').target).toMatchObject({ scope: 'COUNTRY', countryCode: 'AE' });
    expect(r('Site', 'plant 1').target).toMatchObject({ scope: 'SITE', siteId: 7 });
  });
  it('says what is wrong', () => {
    expect(r('Branch', 'Nowhere').error).toMatch(/No branch named "Nowhere"/);
    expect(r('Branch', '').error).toMatch(/Value is required/);
    expect(r('Planet', 'x').error).toMatch(/Company, Country, Branch or Site/);
    expect(r('', 'Pune HQ').error).toMatch(/Applies to/);
  });
});
