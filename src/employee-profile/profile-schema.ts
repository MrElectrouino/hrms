/**
 * Employee profile field definitions (D-023).
 *
 * Source: "HRMS(1).xlsx" (field list) and "HRMS_Recommended_Employee_Profile_Layout.xlsx"
 * (nine tabs, "Profile Layout" sheet). The schema is country-aware: fields with
 * `countries` apply only to those countries, and address levels, bank and statutory
 * fields, document types and currency are resolved from the employee's country.
 *
 * Pure functions only (no I/O) so they can be unit tested.
 */

export const COUNTRIES = ['IN', 'AE', 'GB', 'US'] as const;
export type CountryCode = (typeof COUNTRIES)[number];

export const SECTION_KEYS = [
  'personal',
  'employment',
  'organization',
  'attendance',
  'compensation',
  'bank',
  'documents',
  'education',
  'access',
] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'multiselect' | 'yn';

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  required?: boolean;
  countries?: CountryCode[];
  /** Stored encrypted (PiiService, D-015); returned masked (last 4). */
  sensitive?: boolean;
  mono?: boolean;
  wide?: boolean;
  maxLength?: number;
  hint?: string;
  /** Render a Yes/No field as a checkbox (stored as "Yes" / "No"). */
  display?: 'checkbox';
  /** Options come from a master table at request time (see Lookups). */
  optionsSource?: 'languages' | 'nationalities' | 'employees';
  /** Value/label pairs when the stored value differs from the shown label (e.g. employee id → name). */
  optionItems?: OptionItem[];
}

export interface OptionItem {
  value: string;
  label: string;
}

/** Master-data option lists injected into the schema per request. */
export interface Lookups {
  languages?: string[];
  nationalities?: string[];
  /** Active employees other than the one being edited (value = employee id). */
  employees?: OptionItem[];
}

export interface RowsDef {
  key: string;
  label: string;
  addLabel: string;
  max: number;
  fields: FieldDef[];
  /** Document types etc. depend on country; resolved in buildSections(). */
  countryAware?: boolean;
}

export interface GroupDef {
  title: string;
  fields?: FieldDef[];
  rows?: RowsDef;
  /** Address group: `present` or `permanent` (levels come from the country). */
  addressLevels?: 'present' | 'permanent';
  /** Show this group only when another field in the same section equals a value. */
  showWhen?: { key: string; equals: string };
  /** Grid columns on wide screens (default 3). */
  columns?: 2 | 3 | 4;
  /** Address group: a Yes/No field that, when "Yes", hides the address levels. */
  sameAsKey?: string;
  /** Salary components chosen from an admin-defined salary template (validated by the service). */
  salaryComponents?: boolean;
}

/** Keys of the salary-template group; checked by validateSalary() in the service, not here. */
export const SALARY_KEYS = ['salaryTemplateId', 'componentAmounts'] as const;

export interface SectionDef {
  key: SectionKey;
  title: string;
  group: string;
  description: string;
  /** Only HR and System Admin can see or change this section. */
  hrOnly: boolean;
  groups: GroupDef[];
}

/* ------------------------------------------------------------------ reference data */

export const ADDRESS_LEVELS: Record<CountryCode, string[]> = {
  IN: ['State', 'City', 'Area', 'Street', 'Building', 'PIN Code'],
  AE: ['Emirate', 'City', 'Area', 'Street', 'Building', 'PO Box'],
  GB: ['County', 'Town / City', 'Street', 'Building / Flat', 'Postcode'],
  US: ['State', 'City', 'Street', 'Unit', 'ZIP code'],
};

export const CURRENCY: Record<CountryCode, string> = { IN: 'INR', AE: 'AED', GB: 'GBP', US: 'USD' };

export const LEGAL_ENTITIES: Record<CountryCode, string[]> = {
  IN: ['Meridian Systems India Pvt Ltd'],
  AE: ['Meridian Systems FZ-LLC'],
  GB: ['Meridian Systems UK Ltd'],
  US: ['Meridian Systems Inc.'],
};

export const BRANCHES: Record<CountryCode, string[]> = {
  IN: ['Pune HQ', 'Bengaluru', 'Chennai'],
  AE: ['Dubai Office', 'Abu Dhabi'],
  GB: ['London', 'Manchester'],
  US: ['Austin HQ', 'New York'],
};

export const DOCUMENT_TYPES: Record<CountryCode, string[]> = {
  IN: ['Passport', 'PAN Card', 'Aadhaar Card', 'UAN / PF Documents', 'Work Permit', 'Driving Licence', 'Educational Certificates', 'Relieving Letter', 'Form 16 (last 3 years)'],
  AE: ['Emirates ID', 'Visa', 'Work Permit', 'Labour Card', 'Passport', 'Driving Licence', 'Educational Certificates', 'Experience Certificate'],
  GB: ['Passport', 'Right to Work (share code)', 'P45', 'Educational Certificates'],
  US: ['I-9 Form', 'W-4 Form', 'Passport', "Driver's License", 'Educational Certificates'],
};

const ORG_COUNTRY_OPTIONS = [...COUNTRIES];
const GENDER = ['Male', 'Female', 'Other'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];
const BLOOD = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const RELATION = ['Parent', 'Spouse', 'Sibling', 'Friend', 'Other'];
const EMP_CATEGORY = ['Staff', 'Management', 'Worker'];
const EMP_TYPE = ['Full Time', 'Part Time', 'Contract', 'Intern'];
const EMP_STATUS = ['Active', 'On Notice', 'Inactive'];
const PROBATION = ['3 months', '6 months', '1 year'];
const NOTICE = ['1 month', '2 months', '3 months'];
const DEPARTMENTS = ['Engineering', 'Finance', 'Product', 'Customer Success', 'HR', 'Operations'];
const GRADES = ['G3', 'G4', 'G5', 'G6', 'G7'];
const APPROVERS = ['HR Approvers', 'Finance Approvers', 'Department Heads'];
const ATT_PROCESSING = ['Automatic', 'Manual'];
const ATT_TYPE = ['Biometric', 'Web', 'Mobile'];
const SHIFTS = ['General 09:00–18:00', 'Day 08:00–17:00', 'Night 20:00–05:00'];
const ROSTER = ['Fixed', 'Rotational'];
const WEEKLY_OFF = ['Saturday, Sunday', 'Friday, Saturday', 'Sunday only'];
const GRACE = ['0 min', '5 min', '10 min', '15 min'];
const OT = ['None', '1.25x', '1.5x', '2x'];
const LEAVE_CALENDAR = ['Jan – Dec', 'Apr – Mar'];
const ACCRUAL = ['Monthly', 'Annual', 'Front-loaded'];
const PAYMENT_MODE = ['Bank Transfer', 'Cheque', 'Cash'];
const PAY_FREQ = ['Monthly', 'Bi-weekly'];
const PAY_GROUP = ['A – Monthly', 'B – Contract'];
const PROFICIENCY = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const ACCESS_ROLE = ['Employee', 'Manager', 'HR Admin', 'Payroll Admin', 'System Admin'];
const LOGIN_STATUS = ['Active', 'Locked', 'Disabled'];
const MFA = ['Enabled', 'Disabled'];

/* ------------------------------------------------------------------ schema builder */

function F(key: string, label: string, type: FieldType = 'text', extra: Partial<FieldDef> = {}): FieldDef {
  return { key, label, type, ...extra };
}

/** Builds the nine sections for one employee country (country-dependent options resolved). */
export function buildSections(country: CountryCode, lookups: Lookups = {}): SectionDef[] {
  const fill = (f: FieldDef): FieldDef => {
    if (!f.optionsSource) return f;
    if (f.optionsSource === 'employees') {
      const items = lookups.employees ?? [];
      return { ...f, options: items.map((i) => i.value), optionItems: items };
    }
    return { ...f, options: lookups[f.optionsSource] ?? [] };
  };
  return rawSections(country)
    .map((s) => resolveSection(s, country))
    .map((s) => ({ ...s, groups: s.groups.map((g) => (g.fields ? { ...g, fields: g.fields.map(fill) } : g)) }));
}

function rawSections(country: CountryCode): SectionDef[] {
  return [
    {
      key: 'personal', title: 'Personal', group: 'Profile', hrOnly: false,
      description: 'Identity, contact, emergency contact and addresses.',
      groups: [
        { title: 'Name', columns: 4, fields: [
          F('firstName', 'First name', 'text', { required: true }),
          F('middleName', 'Middle name'),
          F('lastName', 'Last name', 'text', { required: true }),
          F('preferredName', 'Preferred name'),
        ] },
        { title: 'Personal details', columns: 3, fields: [
          F('dateOfBirth', 'Date of birth', 'date', { required: true }),
          F('gender', 'Gender', 'select', { options: GENDER, required: true }),
          F('maritalStatus', 'Marital status', 'select', { options: MARITAL }),
          F('nationality', 'Nationality', 'select', { required: true, optionsSource: 'nationalities' }),
          F('bloodGroup', 'Blood group', 'select', { options: BLOOD }),
          F('religion', 'Religion'),
          F('languages', 'Languages known', 'multiselect', { wide: true, optionsSource: 'languages', hint: 'Choose all that apply' }),
        ] },
        { title: 'Contact', columns: 2, fields: [
          F('personalMobile', 'Personal mobile', 'tel'),
          F('personalEmail', 'Personal email', 'email'),
          F('officialMobile', 'Official mobile', 'tel'),
          F('officialEmail', 'Official email', 'email'),
        ] },
        { title: 'Emergency contact', columns: 2, fields: [
          F('emergencyName', 'Contact name'),
          F('emergencyRelation', 'Relationship', 'select', { options: RELATION }),
          F('emergencyNumber', 'Phone number', 'tel'),
          F('emergencyEmail', 'Email', 'email'),
        ] },
        { title: 'Present address', addressLevels: 'present' },
        {
          title: 'Permanent address',
          addressLevels: 'permanent',
          sameAsKey: 'sameAsPresent',
          fields: [F('sameAsPresent', 'Same as present address', 'yn', { display: 'checkbox' })],
        },
      ],
    },
    {
      key: 'employment', title: 'Employment', group: 'Employment', hrOnly: false,
      description: 'Status, joining, probation, contract and previous employers.',
      groups: [
        { title: 'Employment details', fields: [
          F('employeeCategory', 'Employee category', 'select', { options: EMP_CATEGORY }),
          F('employmentType', 'Employment type', 'select', { options: EMP_TYPE, required: true }),
          F('employmentStatus', 'Employment status', 'select', { options: EMP_STATUS, required: true }),
          F('dateOfJoining', 'Date of joining', 'date', { required: true }),
          F('confirmationDate', 'Confirmation date', 'date'),
          F('probationPeriod', 'Probation period', 'select', { options: PROBATION }),
          F('contractStartDate', 'Contract start date', 'date'),
          F('contractEndDate', 'Contract end date', 'date'),
          F('noticePeriod', 'Notice period', 'select', { options: NOTICE }),
          F('lastWorkingDate', 'Last working date', 'date'),
          F('employmentEndDate', 'Employment end date', 'date'),
        ] },
        { title: 'Previous employment', rows: {
          key: 'previousEmployment', label: 'Previous employer', addLabel: 'Add previous employer', max: 10,
          fields: [F('employer', 'Employer'), F('jobTitle', 'Job title'), F('startDate', 'Start date', 'date'), F('endDate', 'End date', 'date'), F('reasonForLeaving', 'Reason for leaving')],
        } },
      ],
    },
    {
      key: 'organization', title: 'Organization', group: 'Employment', hrOnly: false,
      description: 'Legal entity, branch, department, designation, grade and reporting lines.',
      groups: [
        { title: 'Assignment', fields: [
          F('legalEntityCountry', 'Country of employment', 'select', { options: ORG_COUNTRY_OPTIONS, required: true, hint: 'Drives address, bank, statutory and document fields' }),
          F('legalEntity', 'Legal entity', 'select', { options: LEGAL_ENTITIES[country], required: true }),
          F('branch', 'Branch', 'select', { options: BRANCHES[country] }),
          F('workLocation', 'Work location'),
          F('payrollSite', 'Payroll site'),
          F('department', 'Department', 'select', { options: DEPARTMENTS, required: true }),
          F('designation', 'Designation', 'text', { required: true }),
          F('grade', 'Grade', 'select', { options: GRADES }),
          F('costCentre', 'Cost centre'),
        ] },
        { title: 'Reporting structure', fields: [
          F('reportingManager', 'Reporting manager', 'select', { optionsSource: 'employees' }),
          F('functionalManager', 'Functional manager (dotted line)'),
          F('hrManager', 'HR manager'),
          F('approverGroup', 'Approver group', 'select', { options: APPROVERS }),
        ] },
      ],
    },
    {
      key: 'attendance', title: 'Attendance & Leave', group: 'Time & pay', hrOnly: false,
      description: 'Attendance policy, shift, roster, weekly off, OT and leave policy.',
      groups: [
        { title: 'Attendance', fields: [
          F('attendanceApplicable', 'Attendance applicable', 'yn'),
          F('attendanceProcessing', 'Attendance processing', 'select', { options: ATT_PROCESSING }),
          F('attendanceType', 'Attendance type', 'select', { options: ATT_TYPE }),
          F('shift', 'Shift', 'select', { options: SHIFTS }),
          F('roster', 'Roster', 'select', { options: ROSTER }),
          F('weeklyOff', 'Weekly off', 'select', { options: WEEKLY_OFF }),
          F('gracePeriod', 'Grace period', 'select', { options: GRACE }),
          F('lateDeductionApplicable', 'Late deduction applicable', 'yn'),
          F('overtimeEligible', 'Overtime eligible', 'yn'),
          F('otConfiguration', 'OT configuration', 'select', { options: OT }),
          F('attendanceDeviceId', 'Attendance device ID', 'text', { mono: true }),
          F('biometricId', 'Biometric ID', 'text', { mono: true }),
        ] },
        { title: 'Leave', fields: [
          F('leaveCalendar', 'Leave calendar', 'select', { options: LEAVE_CALENDAR }),
          F('accrualType', 'Accrual type', 'select', { options: ACCRUAL }),
          F('leaveEffectiveFrom', 'Leave effective from', 'date'),
          F('leaveEffectiveTo', 'Leave effective to', 'date'),
          F('annualLeaveEligible', 'Annual leave eligible', 'yn'),
          F('sickLeaveEligible', 'Sick leave eligible', 'yn'),
          F('leaveEncashmentEligible', 'Leave encashment eligible', 'yn'),
        ] },
      ],
    },
    {
      key: 'compensation', title: 'Compensation & Payroll', group: 'Time & pay', hrOnly: false,
      description: 'Salary structure, components, payment mode and payroll configuration.',
      groups: [
        { title: 'Salary structure', fields: [
          F('salaryEffectiveFrom', 'Effective from', 'date'),
          F('salaryEffectiveTo', 'Effective to', 'date'),
          F('paymentMode', 'Payment mode', 'select', { options: PAYMENT_MODE }),
          F('payFrequency', 'Pay frequency', 'select', { options: PAY_FREQ }),
          F('payrollGroup', 'Payroll group', 'select', { options: PAY_GROUP }),
          F('payrollEligible', 'Payroll eligible', 'yn'),
          F('wpsApplicable', 'WPS applicable', 'yn', { countries: ['AE'] }),
        ] },
        { title: 'Salary components (monthly)', salaryComponents: true },
      ],
    },
    {
      key: 'bank', title: 'Bank & Statutory', group: 'Compliance', hrOnly: false,
      description: 'Bank account, tax identifiers, pension and social insurance.',
      groups: [
        { title: 'Bank account', fields: [
          F('bankName', 'Bank name'),
          F('bankBranch', 'Branch'),
          F('accountHolder', 'Account holder'),
          F('accountNumber', 'Account number', 'text', { sensitive: true, mono: true, countries: ['IN', 'GB', 'US'] }),
          F('ifscCode', 'IFSC code', 'text', { mono: true, countries: ['IN'] }),
          F('iban', 'IBAN', 'text', { sensitive: true, mono: true, countries: ['AE'] }),
          F('swiftCode', 'SWIFT code', 'text', { mono: true, countries: ['AE'] }),
          F('sortCode', 'Sort code', 'text', { sensitive: true, mono: true, countries: ['GB'] }),
          F('routingNumber', 'Routing number', 'text', { sensitive: true, mono: true, countries: ['US'] }),
          F('accountType', 'Account type', 'select', { options: ['Checking', 'Savings'], countries: ['US'] }),
        ] },
        { title: 'Statutory & tax', fields: [
          F('pan', 'PAN', 'text', { sensitive: true, mono: true, countries: ['IN'] }),
          F('uan', 'UAN', 'text', { sensitive: true, mono: true, countries: ['IN'] }),
          F('pfApplicable', 'PF applicable', 'yn', { countries: ['IN'] }),
          F('pfNumber', 'PF number', 'text', { mono: true, countries: ['IN'] }),
          F('pfWage', 'PF wage', 'number', { countries: ['IN'] }),
          F('esicApplicable', 'ESIC applicable', 'yn', { countries: ['IN'] }),
          F('esicIpNumber', 'ESIC IP number', 'text', { countries: ['IN'] }),
          F('professionalTaxState', 'Professional tax state', 'select', { options: ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi'], countries: ['IN'] }),
          F('taxRegime', 'Tax regime', 'select', { options: ['Old Regime', 'New Regime'], countries: ['IN'] }),
          F('labourWelfareFund', 'Labour welfare fund applicable', 'yn', { countries: ['IN'] }),
          F('tdsApplicable', 'TDS applicable', 'yn', { countries: ['IN'] }),
          F('gratuityApplicable', 'Gratuity applicable', 'yn', { countries: ['IN', 'AE'] }),
          F('emiratesIdNumber', 'Emirates ID number', 'text', { sensitive: true, mono: true, countries: ['AE'] }),
          F('labourCardNumber', 'Labour card number', 'text', { mono: true, countries: ['AE'] }),
          F('establishmentId', 'Establishment ID', 'text', { mono: true, countries: ['AE'] }),
          F('nationalInsuranceNumber', 'National Insurance number', 'text', { sensitive: true, mono: true, countries: ['GB'] }),
          F('taxCode', 'Tax code', 'text', { countries: ['GB'] }),
          F('studentLoanPlan', 'Student loan plan', 'select', { options: ['None', 'Plan 1', 'Plan 2', 'Plan 4'], countries: ['GB'] }),
          F('autoEnrolmentPension', 'Auto-enrolment pension', 'select', { options: ['Opted in', 'Opted out'], countries: ['GB'] }),
          F('statutorySickPayEligible', 'Statutory sick pay eligible', 'yn', { countries: ['GB'] }),
          F('ssn', 'SSN', 'text', { sensitive: true, mono: true, countries: ['US'] }),
          F('w4FilingStatus', 'W-4 filing status', 'select', { options: ['Single', 'Married', 'Head of Household'], countries: ['US'] }),
          F('stateWithholding', 'State withholding', 'select', { options: ['None (TX)', 'CA', 'NY'], countries: ['US'] }),
          F('flsaClassification', 'FLSA classification', 'select', { options: ['Exempt', 'Non-exempt'], countries: ['US'] }),
          F('k401Contribution', 'Pre-tax 401(k) contribution %', 'text', { countries: ['US'] }),
        ] },
      ],
    },
    {
      key: 'documents', title: 'Documents', group: 'Compliance', hrOnly: false,
      description: 'Passport, visa, licences and other documents with issue and expiry dates.',
      groups: [
        { title: 'Documents', rows: {
          key: 'documents', label: 'Document', addLabel: 'Add document', max: 30, countryAware: true,
          fields: [
            F('documentType', 'Document type', 'select', { required: true }),
            F('documentNumber', 'Number / detail'),
            F('issueDate', 'Issue date', 'date'),
            F('expiryDate', 'Expiry date', 'date'),
            F('fileName', 'File name', 'text', { hint: 'Upload is added in the next release' }),
          ],
        } },
      ],
    },
    {
      key: 'education', title: 'Education & Experience', group: 'Records', hrOnly: false,
      description: 'Qualifications, skills, certifications and professional experience.',
      groups: [
        { title: 'Qualifications', rows: {
          key: 'education', label: 'Qualification', addLabel: 'Add qualification', max: 10,
          fields: [F('qualification', 'Qualification', 'text', { required: true }), F('institution', 'Institution'), F('specialization', 'Specialization'), F('country', 'Country'), F('completionYear', 'Completion year', 'number'), F('gradeResult', 'Grade / result')],
        } },
        { title: 'Skills & certifications', rows: {
          key: 'skills', label: 'Skill', addLabel: 'Add skill or certification', max: 30,
          fields: [F('skill', 'Skill', 'text', { required: true }), F('proficiency', 'Proficiency', 'select', { options: PROFICIENCY }), F('certification', 'Certification'), F('issuingBody', 'Issuing body'), F('issueDate', 'Issue date', 'date'), F('expiryDate', 'Expiry date', 'date')],
        } },
        { title: 'Experience & summary', fields: [
          F('totalExperience', 'Total experience'),
          F('professionalSkills', 'Professional skills', 'textarea', { wide: true, maxLength: 2000 }),
          F('remarks', 'Remarks', 'textarea', { wide: true, maxLength: 2000 }),
        ] },
      ],
    },
    {
      key: 'access', title: 'System Access', group: 'Admin', hrOnly: true,
      description: 'Login, username, role and two-factor authentication. Visible to HR and System Admin only.',
      groups: [
        { title: 'Login & access', fields: [
          F('loginEnabled', 'Login enabled', 'yn'),
          F('username', 'Username', 'text', { mono: true, maxLength: 50 }),
          F('accessRole', 'Role', 'select', { options: ACCESS_ROLE }),
          F('loginStatus', 'Login status', 'select', { options: LOGIN_STATUS }),
          F('twoFactorAuthentication', 'Two-factor authentication', 'select', { options: MFA }),
        ] },
      ],
    },
  ];
}

/** Stored key for an address group: `presentAddress` or `permanentAddress`. */
export function addressKeyFor(level: 'present' | 'permanent'): string {
  return level === 'present' ? 'presentAddress' : 'permanentAddress';
}

/** Every stored field key of a section for a country (rows excluded). */
export function fieldsFor(section: SectionDef, country: CountryCode): FieldDef[] {
  const out: FieldDef[] = [];
  for (const g of section.groups) {
    for (const f of g.fields ?? []) if (applies(f, country)) out.push(f);
    if (g.rows) for (const f of g.rows.fields) if (applies(f, country)) out.push(f);
  }
  return out;
}

export function applies(f: FieldDef, country: CountryCode): boolean {
  return !f.countries || f.countries.includes(country);
}

/** Field key → definition, with options resolved for the country (document types). */
export function resolveSection(section: SectionDef, country: CountryCode): SectionDef {
  return {
    ...section,
    groups: section.groups.map((g) => {
      if (!g.rows) return g;
      const rows = g.rows.countryAware
        ? { ...g.rows, fields: g.rows.fields.map((f) => (f.key === 'documentType' ? { ...f, options: DOCUMENT_TYPES[country] } : f)) }
        : g.rows;
      return { ...g, rows };
    }),
  };
}

/* ------------------------------------------------------------------ validation */

export interface FieldError {
  field: string;
  message: string;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEL_RE = /^[+0-9 ()-]{6,20}$/;

function isValidDate(v: string): boolean {
  if (!DATE_RE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Checks one scalar against its field definition. Returns an error message or null. */
export function checkValue(f: FieldDef, raw: unknown): string | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (Array.isArray(raw) && raw.length === 0) return null;
  if (f.sensitive && typeof raw === 'string' && raw.startsWith('*')) return null; // masked, keep stored value
  switch (f.type) {
    case 'number':
      return typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 ? null : `${f.label} must be a number of 0 or more`;
    case 'date':
      return typeof raw === 'string' && isValidDate(raw) ? null : `${f.label} must be a date (YYYY-MM-DD)`;
    case 'yn':
      return raw === 'Yes' || raw === 'No' ? null : `${f.label} must be Yes or No`;
    case 'select':
      return typeof raw === 'string' && (f.options ?? []).includes(raw) ? null : `${f.label} must be one of the listed options`;
    case 'multiselect': {
      if (!Array.isArray(raw)) return `${f.label} must be a list`;
      if (raw.length > 30) return `${f.label}: choose at most 30`;
      const opts = f.options ?? [];
      const bad = raw.filter((x) => typeof x !== 'string' || !opts.includes(x));
      if (bad.length) return `${f.label}: ${bad.join(', ')} is not one of the listed options`;
      return new Set(raw).size === raw.length ? null : `${f.label} contains duplicates`;
    }
    case 'email':
      return typeof raw === 'string' && EMAIL_RE.test(raw) ? null : `${f.label} must be a valid email`;
    case 'tel':
      return typeof raw === 'string' && TEL_RE.test(raw) ? null : `${f.label} must be a valid phone number`;
    case 'text':
    case 'textarea': {
      if (typeof raw !== 'string') return `${f.label} must be text`;
      const max = f.maxLength ?? (f.type === 'textarea' ? 2000 : 200);
      return raw.length <= max ? null : `${f.label} must be at most ${max} characters`;
    }
  }
}

export interface ValidationResult {
  values: Record<string, unknown>;
  rows: Record<string, Record<string, unknown>[]>;
  errors: FieldError[];
}

/**
 * Validates one section payload for a country. Unknown keys are rejected; required
 * fields are enforced only when they apply to the country and their group is shown.
 */
export function validateSection(section: SectionDef, country: CountryCode, data: Record<string, unknown>): ValidationResult {
  const errors: FieldError[] = [];
  const values: Record<string, unknown> = {};
  const rows: Record<string, Record<string, unknown>[]> = {};
  const resolved = resolveSection(section, country);
  const fieldMap = new Map<string, FieldDef>();
  const rowMap = new Map<string, RowsDef>();
  for (const g of resolved.groups) {
    for (const f of g.fields ?? []) if (applies(f, country)) fieldMap.set(f.key, f);
    if (g.rows) {
      rowMap.set(g.rows.key, g.rows);
    }
  }
  const showGroup = (g: GroupDef) => !g.showWhen || String(values[g.showWhen.key] ?? data[g.showWhen.key] ?? '') === g.showWhen.equals;

  // Address levels are stored as one list per address: presentAddress / permanentAddress.
  const addressKeys = new Set<string>();
  for (const g of resolved.groups) if (g.addressLevels) addressKeys.add(addressKeyFor(g.addressLevels));
  for (const key of addressKeys) {
    const raw = data[key];
    if (raw === undefined) continue;
    if (!Array.isArray(raw) || raw.length > ADDRESS_LEVELS[country].length || raw.some((x) => typeof x !== 'string' || x.length > 200)) {
      errors.push({ field: key, message: 'Address must be a list of text levels' });
      continue;
    }
    values[key] = raw;
  }

  // Salary template keys pass through here; the service checks them against the template.
  const salaryGroup = resolved.groups.some((g) => g.salaryComponents);
  for (const key of SALARY_KEYS) if (salaryGroup && key in data) values[key] = data[key];

  for (const [key, raw] of Object.entries(data)) {
    if (rowMap.has(key) || addressKeys.has(key)) continue;
    if (salaryGroup && (SALARY_KEYS as readonly string[]).includes(key)) continue;
    // Unknown keys are rejected below; known scalar fields are checked here.
    const f = fieldMap.get(key);
    if (!f) { errors.push({ field: key, message: `Unknown or not applicable field: ${key}` }); continue; }
    const err = checkValue(f, raw);
    if (err) errors.push({ field: key, message: err }); else values[key] = raw ?? '';
  }

  for (const g of resolved.groups) {
    if (!g.fields || !showGroup(g)) continue;
    for (const f of g.fields) {
      if (!applies(f, country) || !f.required) continue;
      const v = values[f.key] ?? data[f.key];
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) errors.push({ field: f.key, message: `${f.label} is required` });
    }
  }
  // Address levels are optional in this release (see API_SPECIFICATION §profile).

  // Rows (repeatable records)
  for (const [key, def] of rowMap) {
    const list = data[key];
    if (list === undefined) continue;
    if (!Array.isArray(list)) { errors.push({ field: key, message: `${def.label} must be a list` }); continue; }
    if (list.length > def.max) { errors.push({ field: key, message: `At most ${def.max} ${def.label.toLowerCase()} records` }); continue; }
    const cleaned: Record<string, unknown>[] = [];
    list.forEach((row, i) => {
      if (typeof row !== 'object' || row === null || Array.isArray(row)) { errors.push({ field: `${key}[${i}]`, message: 'Each record must be an object' }); return; }
      const out: Record<string, unknown> = {};
      for (const [rk, rv] of Object.entries(row as Record<string, unknown>)) {
        const f = def.fields.find((x) => x.key === rk && applies(x, country));
        if (!f) { errors.push({ field: `${key}[${i}].${rk}`, message: `Unknown field: ${rk}` }); continue; }
        const err = checkValue(f, rv);
        if (err) errors.push({ field: `${key}[${i}].${rk}`, message: `${def.label} ${i + 1}: ${err}` }); else out[rk] = rv ?? '';
      }
      for (const f of def.fields) {
        if (f.required && applies(f, country) && !(out[f.key] as string)) {
          errors.push({ field: `${key}[${i}].${f.key}`, message: `${def.label} ${i + 1}: ${f.label} is required` });
        }
      }
      cleaned.push(out);
    });
    rows[key] = cleaned;
  }

  return { values, rows, errors };
}

/** Custom field value check (definitions are created by System Admin, D-023). */
export interface CustomFieldDefLike {
  code: string;
  label: string;
  fieldType: string;
  options: string[];
  isRequired: boolean;
}

export function checkCustomValue(def: CustomFieldDefLike, raw: unknown): string | null {
  const empty = raw === undefined || raw === null || raw === '';
  if (empty) return def.isRequired ? `${def.label} is required` : null;
  switch (def.fieldType) {
    case 'Dropdown':
      return typeof raw === 'string' && def.options.includes(raw) ? null : `${def.label} must be one of the listed options`;
    case 'Yes/No':
      return raw === 'Yes' || raw === 'No' ? null : `${def.label} must be Yes or No`;
    case 'Number':
      return typeof raw === 'number' && Number.isFinite(raw) ? null : `${def.label} must be a number`;
    case 'Date':
      return typeof raw === 'string' && isValidDate(raw) ? null : `${def.label} must be a date (YYYY-MM-DD)`;
    case 'Textarea':
      return typeof raw === 'string' && raw.length <= 2000 ? null : `${def.label} must be text up to 2000 characters`;
    default:
      return typeof raw === 'string' && raw.length <= 500 ? null : `${def.label} must be text up to 500 characters`;
  }
}

export const CUSTOM_FIELD_TYPES = ['Text', 'Textarea', 'Number', 'Date', 'Dropdown', 'Yes/No'] as const;

/** Custom field code from a label. Immutable after creation. */
export function codeFromLabel(label: string): string {
  return 'CUSTOM_' + label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/* ------------------------------------------------------------------ salary templates */

export interface SalaryComponentDef {
  code: string;
  label: string;
}

/** Component code from its label (UPPER_SNAKE). Kept stable once saved. */
export function componentCode(label: string): string {
  return label.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

/**
 * Checks amounts entered against a template: only its components, numbers of 0 or more,
 * and at most 2 decimals. Empty values are dropped. Returns cleaned amounts and errors.
 */
export function validateComponentAmounts(
  components: SalaryComponentDef[],
  raw: unknown,
): { amounts: Record<string, number>; errors: FieldError[] } {
  const errors: FieldError[] = [];
  const amounts: Record<string, number> = {};
  if (raw === undefined || raw === null) return { amounts, errors };
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return { amounts, errors: [{ field: 'componentAmounts', message: 'Salary components must be a list of amounts' }] };
  }
  const byCode = new Map(components.map((c) => [c.code, c]));
  for (const [code, value] of Object.entries(raw as Record<string, unknown>)) {
    const c = byCode.get(code);
    if (!c) { errors.push({ field: `componentAmounts.${code}`, message: `${code} is not part of the selected template` }); continue; }
    if (value === '' || value === null || value === undefined) continue;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      errors.push({ field: `componentAmounts.${code}`, message: `${c.label} must be an amount of 0 or more` });
      continue;
    }
    if (Math.round(value * 100) !== value * 100) {
      errors.push({ field: `componentAmounts.${code}`, message: `${c.label} can have at most 2 decimals` });
      continue;
    }
    amounts[code] = value;
  }
  return { amounts, errors };
}
