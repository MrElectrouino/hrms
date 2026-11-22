import { formatEmployeeCode, nextCodeNumber } from './employee-code';

describe('branch wise employee codes', () => {
  it('starts at 1 when the branch has no employees yet', () => {
    expect(nextCodeNumber([], 'EA-')).toBe(1);
    expect(formatEmployeeCode('EA-', 1)).toBe('EA-001');
  });
  it('goes on from the highest number, including codes typed by hand', () => {
    expect(nextCodeNumber(['EA-001', 'EA-315', 'EA-12'], 'EA-')).toBe(316);
    expect(formatEmployeeCode('EA-', 316)).toBe('EA-316');
  });
  it('ignores other prefixes and codes that are not just a number after the prefix', () => {
    expect(nextCodeNumber(['ED-900', 'EA-X7', 'EAB-5', 'EA-4'], 'EA-')).toBe(5);
  });
  it('is not case sensitive and grows past three digits', () => {
    expect(nextCodeNumber(['ea-999'], 'EA-')).toBe(1000);
    expect(formatEmployeeCode('ea-', 1000)).toBe('EA-1000');
  });
});
