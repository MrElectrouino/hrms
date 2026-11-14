/**
 * Demo people for the LOCAL development database only: HR, managers and executives with logins.
 * Safe to run again (existing usernames are skipped). Remove them with `node prisma/seed-demo.mjs --remove`.
 * All demo accounts share one password, printed at the end.
 */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const url = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname)) {
  console.error(`Refusing to run: the database host is ${url.hostname}, not localhost.`);
  process.exit(1);
}
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const PASSWORD = 'Demo@12345';
const UT = { Executive: 1, Manager: 2, HRAdmin: 4 };

// name, last name, username, role, department, branch, country, employment type, joined, reports to (username), gender
const PEOPLE = [
  ['Priya', 'Sharma', 'priya.hr', 'HRAdmin', 'HR', 'Pune HQ', 'IN', 'Permanent', '2019-04-01', null, 'Female'],
  ['Omar', 'Hassan', 'omar.hr', 'HRAdmin', 'HR', 'Dubai Office', 'AE', 'Permanent', '2020-02-10', null, 'Male'],
  ['Rahul', 'Mehta', 'rahul.mgr', 'Manager', 'Sales', 'Pune HQ', 'IN', 'Permanent', '2018-06-15', null, 'Male'],
  ['Fatima', 'Al Zaabi', 'fatima.mgr', 'Manager', 'Operations', 'Dubai Office', 'AE', 'Permanent', '2019-09-01', null, 'Female'],
  ['James', 'Carter', 'james.mgr', 'Manager', 'IT', 'Austin HQ', 'US', 'Permanent', '2017-01-09', null, 'Male'],
  ['Anita', 'Desai', 'anita.emp', 'Executive', 'Sales', 'Pune HQ', 'IN', 'Permanent', '2021-03-01', 'rahul.mgr', 'Female'],
  ['Vikram', 'Singh', 'vikram.emp', 'Executive', 'Sales', 'Pune HQ', 'IN', 'On Contract', '2025-07-16', 'rahul.mgr', 'Male'],
  ['Sneha', 'Iyer', 'sneha.emp', 'Executive', 'Finance', 'Bengaluru', 'IN', 'Permanent', '2022-11-21', 'rahul.mgr', 'Female'],
  ['Khalid', 'Mansoor', 'khalid.emp', 'Executive', 'Operations', 'Dubai Office', 'AE', 'Permanent', '2020-05-04', 'fatima.mgr', 'Male'],
  ['Layla', 'Nasser', 'layla.emp', 'Executive', 'Stores', 'Abu Dhabi', 'AE', 'Permanent', '2023-01-15', 'fatima.mgr', 'Female'],
  ['Yusuf', 'Ali', 'yusuf.emp', 'Executive', 'Operations', 'Dubai Office', 'AE', 'Intern', '2026-09-01', 'fatima.mgr', 'Male'],
  ['Emily', 'Brooks', 'emily.emp', 'Executive', 'IT', 'Austin HQ', 'US', 'Permanent', '2021-08-02', 'james.mgr', 'Female'],
  ['Daniel', 'Reed', 'daniel.emp', 'Executive', 'IT', 'New York', 'US', 'Permanent', '2024-02-12', 'james.mgr', 'Male'],
  ['Sophie', 'Turner', 'sophie.emp', 'Executive', 'Admin', 'London', 'GB', 'Temporary', '2026-03-02', 'james.mgr', 'Female'],
];

async function remove() {
  const users = await prisma.user.findMany({ where: { username: { in: PEOPLE.map((p) => p[2]) } }, select: { id: true, profileId: true } });
  const profileIds = users.map((u) => u.profileId);
  const emps = await prisma.employee.findMany({ where: { profileId: { in: profileIds } }, select: { id: true } });
  const ids = emps.map((e) => e.id);
  await prisma.employee.updateMany({ where: { reportingToId: { in: ids } }, data: { reportingToId: null } });
  for (const model of ['attendance', 'attendancePunch', 'leaveTransaction', 'leaveAllocation', 'leaveCredit', 'leaveApplication', 'leaveEntitlementRun']) {
    try { await prisma[model].deleteMany({ where: { employeeId: { in: ids } } }); } catch { /* model has no employeeId or does not exist */ }
  }
  await prisma.employee.deleteMany({ where: { id: { in: ids } } });
  await prisma.userBranch.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } });
  await prisma.session.deleteMany({ where: { userId: { in: users.map((u) => u.id) } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
  await prisma.profile.deleteMany({ where: { id: { in: profileIds } } });
  console.log(`Removed ${users.length} demo people.`);
}

async function add() {
  const params = await prisma.parameter.findMany({ where: { parameterType: { name: { in: ['Branch', 'Department', 'Gender', 'Employee Type'] } } }, select: { id: true, text: true, parameterType: { select: { name: true } } } });
  const find = (type, text) => params.find((p) => p.parameterType.name === type && p.text === text)?.id ?? null;
  const hash = await bcrypt.hash(PASSWORD, 12);
  const empIds = new Map();
  let made = 0;
  for (const [name, lastName, username, role, dept, branch, country, empType, joined, reportsTo, gender] of PEOPLE) {
    if (await prisma.user.findUnique({ where: { username } })) {
      const u = await prisma.user.findUnique({ where: { username }, select: { profile: { select: { employee: { select: { id: true } } } } } });
      if (u?.profile?.employee) empIds.set(username, u.profile.employee.id);
      continue;
    }
    const emp = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({ data: { name, lastName, email: `${username}@demo.test`, genderId: find('Gender', gender), userTypeId: UT[role] } });
      const employee = await tx.employee.create({
        data: {
          profileId: profile.id,
          employeeCode: `DEMO${String(made + empIds.size + 1).padStart(3, '0')}`,
          dateOfJoining: new Date(`${joined}T00:00:00Z`),
          designation: role === 'Manager' ? `${dept} Manager` : role === 'HRAdmin' ? 'HR Manager' : `${dept} Executive`,
          branchId: find('Branch', branch),
          employeeTypeId: find('Employee Type', empType),
          shiftId: 1,
          reportingToId: reportsTo ? empIds.get(reportsTo) ?? null : null,
          workEmail: `${username}@demo.test`,
        },
      });
      await tx.employeeProfileSection.create({ data: { employeeId: employee.id, sectionKey: 'organization', data: { legalEntityCountry: country, employmentType: empType, department: dept, branch: String(find('Branch', branch)) } } });
      await tx.user.create({ data: { profileId: profile.id, userTypeId: UT[role], username, passwordHash: hash, mustChangePassword: false, allBranches: true } });
      return employee;
    });
    empIds.set(username, emp.id);
    made++;
  }
  console.log(`Created ${made} demo people.\n`);
  console.log('Username'.padEnd(14), 'Role'.padEnd(10), 'Branch'.padEnd(14), 'Reports to');
  for (const p of PEOPLE) console.log(p[2].padEnd(14), p[3].padEnd(10), p[5].padEnd(14), p[9] ?? '');
  console.log(`\nPassword for all: ${PASSWORD}`);
}

try {
  if (process.argv.includes('--remove')) await remove();
  else await add();
} finally {
  await prisma.$disconnect();
}
