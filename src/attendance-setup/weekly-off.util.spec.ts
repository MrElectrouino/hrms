import { describeDays, validateDays } from './weekly-off.util';

describe('weekly off days', () => {
  it('lists days in week order starting Monday', () => {
    expect(describeDays([0, 6])).toBe('Saturday, Sunday');
    expect(describeDays([6, 5])).toBe('Friday, Saturday');
    expect(describeDays([0])).toBe('Sunday');
  });
  it('needs at least one day, valid weekdays, no repeats, and one working day', () => {
    expect(validateDays([0, 6])).toEqual([]);
    expect(validateDays([])[0]).toMatch(/at least one day/);
    expect(validateDays([7])[0]).toMatch(/Sunday to Saturday/);
    expect(validateDays([1, 1])[0]).toMatch(/twice/);
    expect(validateDays([0, 1, 2, 3, 4, 5, 6])[0]).toMatch(/working day/);
  });
});
