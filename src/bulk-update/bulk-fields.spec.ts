import { BULK_FIELDS, validateChanges } from './bulk-fields';

const options = { branch: ['1', '2'], department: ['Sales', 'HR'], shift: ['1'], attendanceApplicable: ['Yes', 'No'] };

describe('bulk update fields', () => {
  it('only offers fields that make sense for a group', () => {
    const keys = BULK_FIELDS.map((f) => f.key);
    for (const personal of ['firstName', 'lastName', 'dateOfJoining', 'email', 'phone', 'salary', 'bankAccount', 'passportNumber', 'employeeCode']) {
      expect(keys).not.toContain(personal);
    }
    expect(keys).toEqual(expect.arrayContaining(['branch', 'department', 'reportingManager', 'shift']));
  });

  it('accepts valid changes', () => {
    expect(validateChanges([{ field: 'branch', value: '2' }, { field: 'department', value: 'Sales' }, { field: 'designation', value: 'Lead' }, { field: 'attendanceApplicable', value: 'No' }], options)).toEqual([]);
  });

  it('needs at least one change and knows only the listed fields', () => {
    expect(validateChanges([], options)[0]).toMatch(/at least one/);
    expect(validateChanges([{ field: 'salary', value: '1' }], options)[0]).toMatch(/cannot be updated in bulk/);
  });

  it('rejects an option that is not on the list, and a repeated field', () => {
    expect(validateChanges([{ field: 'branch', value: '9' }], options)[0]).toMatch(/not one of the available options/);
    expect(validateChanges([{ field: 'department', value: 'Sales' }, { field: 'department', value: 'HR' }], options)[0]).toMatch(/twice/);
  });

  it('allows clearing an optional field but not a required one', () => {
    expect(validateChanges([{ field: 'shift', value: null }], options)).toEqual([]);
    expect(validateChanges([{ field: 'department', value: null }], options)[0]).toMatch(/required/);
    expect(validateChanges([{ field: 'designation', value: '  ' }], options)[0]).toMatch(/required/);
  });

  it('checks text length and yes/no', () => {
    expect(validateChanges([{ field: 'workLocation', value: 'x'.repeat(121) }], options)[0]).toMatch(/too long/);
    expect(validateChanges([{ field: 'attendanceApplicable', value: 'Maybe' }], options)[0]).toMatch(/Yes or No/);
  });
});
