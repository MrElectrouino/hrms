import { checkFormula, evalFormula, pickCarryRule } from './leave-formula';

const vars = { workdays: 73, yearDays: 365, annualDays: 30, serviceMonths: 14 };

describe('leave formula', () => {
  it('works out the UAE annual leave formula', () => {
    expect(evalFormula('workdays * 30 / 365', vars)).toBeCloseTo(6, 5);
    expect(evalFormula('workdays * annualDays / yearDays', vars)).toBeCloseTo(6, 5);
  });
  it('respects precedence, brackets, minus and functions', () => {
    expect(evalFormula('2 + 3 * 4', vars)).toBe(14);
    expect(evalFormula('(2 + 3) * 4', vars)).toBe(20);
    expect(evalFormula('-workdays + 100', vars)).toBe(27);
    expect(evalFormula('min(annualDays, workdays / 2)', vars)).toBe(30);
  });
  it('rejects anything that is not a plain calculation', () => {
    expect(checkFormula('workdays * 30 / 365')).toBeNull();
    expect(checkFormula('process.exit()')).not.toBeNull();
    expect(checkFormula('workdays * bonus')).toMatch(/Unknown name/);
    expect(checkFormula('2 +')).not.toBeNull();
    expect(checkFormula('1 / 0')).toMatch(/zero/);
    expect(checkFormula('')).toMatch(/empty/);
  });
});

describe('carry forward by category', () => {
  const rules = [
    { category: 'Blue Collar', action: 'UNPAID_LEAVE' as const, targetLeaveTypeId: 9 },
    { category: 'White Collar', action: 'LEAVE_SALARY' as const },
  ];
  it('matches the category ignoring case', () => {
    expect(pickCarryRule(rules, 'blue collar').action).toBe('UNPAID_LEAVE');
    expect(pickCarryRule(rules, 'White Collar').action).toBe('LEAVE_SALARY');
  });
  it('keeps the leave when nothing matches, or uses a catch-all', () => {
    expect(pickCarryRule(rules, null).action).toBe('KEEP');
    expect(pickCarryRule([...rules, { category: '*', action: 'LAPSE' as const }], 'Other').action).toBe('LAPSE');
  });
});
