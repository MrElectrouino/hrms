/**
 * Imports employees from the old system's JSON (the "DisplayName / FieldName / FieldValue / DropDownList" format).
 *
 * It goes through the application's own services, so every rule still applies: validation, encrypted personal data,
 * employee codes, branch and shift links, and the login account.
 *
 *   npm run build                                  (the tool uses the compiled app in dist/)
 *   node tools/legacy-import/import-employees.js <file.json> [--commit]
 *
 * The file is one employee (an array of fields) or several (an array of such arrays). Without --commit nothing is
 * saved: it only checks and prints what would be created and what could not be matched.
 *
 * Temporary passwords of the new logins are written to handover/import-logins.txt (git-ignored), never printed.
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { NestFactory } = require('@nestjs/core');

const file = process.argv[2];
const commit = process.argv.includes('--commit');
// --password=<value>: give every new login this password instead of a generated one (they still must change it at first sign-in).
// --category=<text>: the Employee Category (for example "Blue Collar") for everyone in this file; the old format has no such field.
const category = (process.argv.find((a) => a.startsWith('--category=')) || '').slice('--category='.length) || undefined;
const fixedPassword = (process.argv.find((a) => a.startsWith('--password=')) || '').slice('--password='.length) || undefined;
if (!file) {
  console.error('Usage: node tools/legacy-import/import-employees.js <file.json> [--commit]');
  process.exit(1);
}

/* ------------------------------------------------------------------ reading the old format */

const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
const people = Array.isArray(raw[0]) ? raw : [raw];

const clean = (v) => (v === null || v === undefined || String(v).trim() === '' || String(v) === 'null' ? null : String(v).trim());
const reader = (fields) => {
  const find = (name, table) => fields.find((f) => f.FieldName === name && (!table || f.TableName === table));
  return {
    value: (name, table) => clean(find(name, table)?.FieldValue),
    /** The text of the chosen dropdown item (the old system stored its id). */
    label: (name, table) => {
      const f = find(name, table);
      const v = clean(f?.FieldValue);
      if (v === null) return null;
      const hit = (f.DropDownList || []).find((x) => String(x.Id) === v);
      return hit ? String(hit.Name).trim() : null;
    },
  };
};
/** 15/05/1978 -> 1978-05-15 */
const isoDate = (v) => {
  const m = v && /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(v);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};
const same = (a, b) => String(a).replace(/\s+/g, '').toLowerCase() === String(b).replace(/\s+/g, '').toLowerCase();
const drop = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== null && v !== undefined && v !== ''));

/* ------------------------------------------------------------------ the run */

(async () => {
  const { AppModule } = require(path.join(process.cwd(), 'dist/app.module'));
  const { PrismaService } = require(path.join(process.cwd(), 'dist/prisma/prisma.service'));
  const { EmployeesService } = require(path.join(process.cwd(), 'dist/employees/employees.service'));
  const { EmployeeProfileService } = require(path.join(process.cwd(), 'dist/employee-profile/employee-profile.service'));
  const { UsersService } = require(path.join(process.cwd(), 'dist/users/users.service'));
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error'] });
  const prisma = app.get(PrismaService);
  const employees = app.get(EmployeesService);
  const profiles = app.get(EmployeeProfileService);
  const users = app.get(UsersService);

  const admin = await prisma.user.findFirst({ where: { userTypeId: 3, isActive: true }, select: { id: true, profileId: true } });
  if (!admin) throw new Error('There is no System Admin to run the import as');
  const actor = { userId: admin.id, profileId: admin.profileId, userTypeId: 3, sessionId: '0', mustChangePassword: false, branchAccess: null, activeBranchIds: null };

  const branches = await prisma.branch.findMany({ where: { isActive: true }, select: { id: true, name: true, code: true } });
  const shifts = await prisma.shift.findMany({ where: { isActive: true }, select: { id: true, name: true } });
  const userTypes = await prisma.userType.findMany({ select: { id: true, name: true } });
  const loginLines = [];
  let created = 0;
  let failed = 0;

  for (const fields of people) {
    const f = reader(fields);
    const name = [f.value('Name', 'usr.Profile'), f.value('LastName', 'usr.Profile')].filter(Boolean).join(' ');
    const code = f.value('EmployeeCode', 'usr.Employee');
    const problems = [];
    const notes = [];

    // --- where they work
    const locationName = f.label('Location', 'usr.Employee');
    // The old Location (for example "Dubai") may be shorter than the branch name; the Site ("Dubai Head Office") is the fallback.
    const siteName = f.label('SiteId', 'usr.Employee');
    const branch = (locationName && branches.find((b) => same(b.name, locationName))) || (siteName && branches.find((b) => same(b.name, siteName))) || null;
    if (!branch) problems.push(`Branch not found for location "${locationName ?? ''}" (add the branch first)`);
    const shiftName = f.label('ShiftId', 'usr.Employee');
    const shift = shiftName ? shifts.find((s) => same(s.name, shiftName)) : null;
    if (shiftName && !shift) problems.push(`Shift "${shiftName}" not found`);

    // --- dropdown values must exist in the app
    const parameter = async (type, text) => (text ? prisma.parameter.findFirst({ where: { parameterType: { name: type }, text: { equals: text, mode: 'insensitive' } } }) : null);
    const nationality = f.label('Nationality', 'usr.Profile');
    if (nationality && !(await parameter('Nationality', nationality))) {
      if (commit) {
        const type = await prisma.parameterType.findUnique({ where: { name: 'Nationality' } });
        await prisma.parameter.create({ data: { parameterTypeId: type.id, text: nationality, displayOrder: 999 } });
        notes.push(`Added the nationality "${nationality}" to the list`);
      } else notes.push(`The nationality "${nationality}" will be added to the list`);
    }
    const department = f.label('DepartmentId', 'usr.Employee');
    if (department && !(await parameter('Department', department))) problems.push(`Department "${department}" is not in the Department list`);
    const employmentType = f.label('EmployeeTypeId', 'usr.Employee');
    if (employmentType && !(await parameter('Employee Type', employmentType))) problems.push(`Employee type "${employmentType}" is not in the Employee Type list`);
    const contractType = f.label('ContractTypeId', 'usr.Profile');
    const statusText = 'Active';
    if (category && !(await parameter('Employee Category', category))) problems.push(`Employee category "${category}" is not in the Employee Category list`);
    if (!(await parameter('Employment Status', statusText))) problems.push('The Employment Status list has no "Active" value');

    // --- the sections of the profile
    const joining = isoDate(f.value('DateOfJoining', 'usr.Employee'));
    const sections = {
      personal: {
        data: drop({
          firstName: f.value('Name', 'usr.Profile'),
          middleName: f.value('MiddleName', 'usr.Profile'),
          lastName: f.value('LastName', 'usr.Profile'),
          dateOfBirth: isoDate(f.value('DOB', 'usr.Profile')),
          gender: f.label('Gender', 'usr.Profile'),
          maritalStatus: f.label('MaritalStatus', 'usr.Profile'),
          nationality,
          bloodGroup: f.label('BloodGroup', 'usr.Profile'),
          personalMobile: f.value('ContactNo', 'usr.Profile'),
          personalEmail: f.value('Email', 'usr.Profile'),
          officialMobile: f.value('CompanyMobileNo', 'usr.Employee'),
          officialEmail: f.value('WorkEmail', 'usr.Employee'),
          // The old system kept one free-text address; it goes in the Street line of the address.
          presentAddress: f.value('Address', 'usr.Profile') ? ['', '', '', f.value('Address', 'usr.Profile'), '', ''] : undefined,
          permanentAddress: f.value('HomeCountryAddress', 'usr.Profile') ? ['', '', '', f.value('HomeCountryAddress', 'usr.Profile'), '', ''] : undefined,
          sameAsPresent: 'No',
        }),
      },
      employment: {
        data: drop({
          employmentType,
          employmentStatus: statusText,
          employeeCategory: category,
          dateOfJoining: joining,
          confirmationDate: isoDate(f.value('DateofConfirmation', 'usr.Employee')),
          rejoiningDate: isoDate(f.value('DateOfRejoining', 'usr.Profile')),
        }),
      },
      organization: {
        data: drop({
          legalEntityCountry: 'AE',
          branch: branch ? String(branch.id) : undefined,
          payrollSite: f.label('PayrollSiteId', 'usr.Employee'),
          department,
          designation: f.value('Designation', 'usr.Employee'),
        }),
      },
      attendance: { data: drop({ shift: shift ? String(shift.id) : undefined }) },
      bank: {
        data: drop({
          bankName: f.value('Bankname', 'usr.Account'),
          iban: f.value('IBAN', 'usr.Account'),
          swiftCode: f.value('SWIFT', 'usr.Account'),
          emiratesIdNumber: f.value('EmiratesId', 'usr.Profile'),
          labourCardNumber: f.value('MOLNo', 'usr.Profile'),
        }),
      },
    };
    const docs = [
      ['Passport', f.value('PassportNo', 'usr.Profile')],
      ['Emirates ID', f.value('EmiratesId', 'usr.Profile')],
      ['Visa', f.value('VisaNo', 'usr.Profile')],
    ].filter(([, n]) => n);
    if (docs.length) sections.documents = { data: { documents: docs.map(([documentType, documentNumber]) => ({ documentType, documentNumber })) } };

    // Things the old record has that this app has no place for yet.
    if (clean(f.value('ReportingTo', 'usr.Employee'))) notes.push(`Reporting manager (old id ${f.value('ReportingTo', 'usr.Employee')}) is not linked: set it on the Employment tab once that person exists`);
    if (f.value('HomeCountryPhoneNo', 'usr.Profile')) notes.push('Home country phone is not stored (no field for it)');
    if (f.label('VisaType', 'usr.Profile')) notes.push(`Visa type "${f.label('VisaType', 'usr.Profile')}" is not stored on the profile`);

    // --- already there?
    if (code && (await prisma.employee.findUnique({ where: { employeeCode: code }, select: { id: true } }))) problems.push(`Employee code ${code} already exists`);

    // --- the app's own validation
    if (!problems.length) {
      const check = await profiles.validateNewProfile('AE', sections, actor);
      if (!check.valid) for (const [section, errs] of Object.entries(check.errors)) for (const e of errs) problems.push(`${section}: ${e.message}`);
    }

    console.log(`\n${name || '(no name)'}  ${code ?? ''}`);
    for (const n of notes) console.log(`  note: ${n}`);
    for (const p of problems) console.log(`  PROBLEM: ${p}`);
    if (problems.length) {
      failed += 1;
      continue;
    }
    if (!commit) {
      console.log('  ok: would be created');
      continue;
    }

    // --- create
    const emp = await employees.create(
      drop({
        firstName: sections.personal.data.firstName,
        middleName: sections.personal.data.middleName,
        lastName: sections.personal.data.lastName,
        email: sections.personal.data.personalEmail,
        workEmail: sections.personal.data.officialEmail,
        employeeCode: code,
        employmentType,
        dateOfJoining: joining,
        dateOfConfirmation: sections.employment.data.confirmationDate,
        designation: sections.organization.data.designation,
        personIdNumber: f.value('PersonIDNumber', 'usr.Employee'),
        branchId: branch.id,
        shiftId: shift?.id,
        isSiteAccess: f.value('IsSiteAccess', 'usr.Profile') === 'True',
      }),
      admin.profileId,
      undefined,
      actor,
    );
    const failedSections = [];
    for (const [key, body] of Object.entries(sections)) {
      try {
        await profiles.saveSection(emp.id, key, { data: body.data }, actor, '');
      } catch (e) {
        failedSections.push(`${key}: ${e.message}`);
      }
    }
    if (contractType) {
      const type = await prisma.parameterType.findUnique({ where: { name: 'Contract Type' } });
      const param = (await parameter('Contract Type', contractType)) ?? (type ? await prisma.parameter.create({ data: { parameterTypeId: type.id, text: contractType, displayOrder: 999 } }) : null);
      if (param) await prisma.employee.update({ where: { id: emp.id }, data: { contractTypeId: param.id } });
    }

    // --- the login
    const username = f.value('UserName', 'usr.SiteUser');
    if (username) {
      const typeName = f.label('UserTypeId', 'usr.SiteUser');
      const userType = typeName ? userTypes.find((t) => same(t.name, typeName)) : null;
      if (!userType) {
        console.log(`  note: login not created, user type "${typeName ?? ''}" not found`);
      } else {
        try {
          const made = await users.create({ username, userTypeId: userType.id, profileId: emp.profileId, email: sections.personal.data.personalEmail, allBranches: true, ...(fixedPassword ? { password: fixedPassword } : {}) }, actor);
          if (made.temporaryPassword && !fixedPassword) loginLines.push(`${username}\t${made.temporaryPassword}`);
          console.log(`  login created (${userType.name}); ${fixedPassword ? "the password is the one given with --password" : "the temporary password is in handover/import-logins.txt"}`);
        } catch (e) {
          console.log(`  note: login not created: ${e.message}`);
        }
      }
    }
    created += 1;
    console.log(`  created: ${emp.employeeCode}${failedSections.length ? `  (not saved: ${failedSections.join('; ')})` : ''}`);
  }

  if (loginLines.length) {
    fs.mkdirSync('handover', { recursive: true });
    fs.appendFileSync('handover/import-logins.txt', loginLines.join('\n') + '\n');
  }
  console.log(`\n${commit ? `Created ${created}` : 'Checked'}, ${failed} with problems.`);
  await app.close();
})().catch((e) => {
  console.error('Import failed:', e.message);
  process.exit(1);
});
