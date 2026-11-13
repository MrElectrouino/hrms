/**
 * Provisions a new company: creates a fresh Postgres database, runs every
 * migration against it, seeds the core system catalog (user types, roles,
 * parameters, messages, menu items — needed for the app to function at all),
 * applies the chosen template's country/currency/timezone defaults, and
 * creates that company's first System Administrator account.
 *
 * Architecture: database-per-company (see planning/system_application_module.md
 * implementation note and DECISIONS.md) — there is no Organization model or
 * organizationId column anywhere; isolation is one Postgres database per
 * company, not shared rows. This script is how a new one gets created.
 *
 * Usage:
 *   npx ts-node scripts/provision-company.ts \
 *     --name "Acme Corp" --template uae|india|global \
 *     --admin-username admin --admin-password "Secret@123" [--admin-name "Super Admin"]
 *
 * The admin DATABASE_URL_UNPOOLED (host/port/credentials) must point at a
 * Postgres server with permission to CREATE DATABASE. The new database is
 * named hrms_<slug of --name>; the script refuses to run if it already exists
 * (use a different --name, or drop that database yourself first).
 */
import 'dotenv/config';
import { Client } from 'pg';
import { spawnSync } from 'child_process';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

type Template = 'uae' | 'india' | 'global';

const TEMPLATES: Record<Template, { countries: string[]; defaultCountry: string; defaultCurrency: string; defaultTimezone: string }> = {
  uae: { countries: ['AE'], defaultCountry: 'AE', defaultCurrency: 'AED', defaultTimezone: 'Asia/Dubai' },
  india: { countries: ['IN'], defaultCountry: 'IN', defaultCurrency: 'INR', defaultTimezone: 'Asia/Kolkata' },
  global: { countries: ['AE', 'IN'], defaultCountry: 'AE', defaultCurrency: 'AED', defaultTimezone: 'Asia/Dubai' },
};

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const name = get('--name');
  const template = get('--template') as Template | undefined;
  const adminUsername = get('--admin-username');
  const adminPassword = get('--admin-password');
  const adminName = get('--admin-name') ?? adminUsername;

  if (!name || name.trim().length < 2) fail('--name is required (at least 2 characters)');
  if (!template || !(template in TEMPLATES)) fail('--template must be one of: uae, india, global');
  if (!adminUsername || adminUsername.length < 3) fail('--admin-username is required (at least 3 characters)');
  if (!adminPassword || adminPassword.length < 8) fail('--admin-password is required (at least 8 characters)');

  return { name: name!.trim(), template: template!, adminUsername: adminUsername!.toLowerCase(), adminPassword: adminPassword!, adminName: adminName! };
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
}

function run(command: string, args: string[], env: NodeJS.ProcessEnv) {
  const result = spawnSync(command, args, { env, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) {
    fail(`"${command} ${args.join(' ')}" exited with code ${result.status}`);
  }
}

async function main() {
  const { name, template, adminUsername, adminPassword, adminName } = parseArgs();
  const dbName = `hrms_${slugify(name)}`;

  const adminUrl = process.env.DATABASE_URL_UNPOOLED;
  if (!adminUrl) fail('DATABASE_URL_UNPOOLED must be set (used both as the admin connection and as the template for the new database)');
  const parsed = new URL(adminUrl!);

  console.log(`Provisioning "${name}" (template: ${template}) as database "${dbName}" on ${parsed.hostname}...`);

  // 1. Create the database (connect to the server's maintenance db, not the target db itself).
  const maintenanceUrl = new URL(adminUrl!);
  maintenanceUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: maintenanceUrl.toString() });
  await admin.connect();
  try {
    const existing = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
    if ((existing.rowCount ?? 0) > 0) {
      fail(`Database "${dbName}" already exists. Pick a different --name, or drop it yourself first.`);
    }
    // Database names cannot be parameterized; dbName is our own slugify() output (safe charset).
    await admin.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  } finally {
    await admin.end();
  }

  const newDbUrl = new URL(adminUrl!);
  newDbUrl.pathname = `/${dbName}`;
  const childEnv = { ...process.env, DATABASE_URL: newDbUrl.toString(), DATABASE_URL_UNPOOLED: newDbUrl.toString() };

  // 2. Apply every migration to the new database.
  console.log('Running migrations...');
  run('npx', ['prisma', 'migrate', 'deploy'], childEnv);

  // 3. Seed the core system catalog only — not Emove's own demo sites/languages/shifts.
  console.log('Seeding core catalog...');
  run('npx', ['ts-node', 'prisma/seed.ts'], { ...childEnv, SKIP_REFERENCE_MASTERS: '1' });

  // 4. Apply the template's country/currency/timezone defaults and create the admin account.
  const adapter = new PrismaPg({ connectionString: newDbUrl.toString() });
  const prisma = new PrismaClient({ adapter });
  try {
    const t = TEMPLATES[template];
    await prisma.country.updateMany({
      where: { isoCode: { notIn: t.countries } },
      data: { isActive: false },
    });
    await prisma.systemConfiguration.updateMany({ where: { name: 'Default Country' }, data: { value: t.defaultCountry } });
    await prisma.systemConfiguration.updateMany({ where: { name: 'Default Currency' }, data: { value: t.defaultCurrency } });
    await prisma.systemConfiguration.updateMany({ where: { name: 'Default Timezone' }, data: { value: t.defaultTimezone } });
    console.log(`Applied "${template}" template: countries=${t.countries.join(',')}, defaultCountry=${t.defaultCountry}.`);

    const userType = await prisma.userType.findUnique({ where: { id: 3 } }); // SystemAdmin
    if (!userType) fail('UserType 3 (System Admin) missing after seed — this should not happen');

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    const { user, profile } = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.create({ data: { name: adminName, isSiteAccess: true } });
      const user = await tx.user.create({
        data: { username: adminUsername, passwordHash, userTypeId: 3, profileId: profile.id, isActive: true, mustChangePassword: false },
      });
      return { user, profile };
    });
    console.log(`Created System Administrator "${user.username}" (user id ${user.id}, profile id ${profile.id}).`);
  } finally {
    await prisma.$disconnect();
  }

  const redacted = new URL(newDbUrl.toString());
  if (redacted.password) redacted.password = '***';
  console.log(`\nDone. Database: ${redacted.toString()}`);
  console.log('Point this company\'s deployment at DATABASE_URL / DATABASE_URL_UNPOOLED for that database');
  console.log('(same host/credentials as this admin connection, database name above) — read them from');
  console.log('your own secret store rather than pasting a password into a terminal or chat.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
