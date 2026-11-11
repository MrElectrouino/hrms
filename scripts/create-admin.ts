/**
 * One-off bootstrap: creates the first System Administrator account.
 * The app has no self-registration endpoint, so a fresh database has zero
 * users and every login fails with "Invalid credentials" (see auth.service.ts)
 * until one of these is run.
 *
 * Usage:
 *   npx ts-node scripts/create-admin.ts <username> <password> [name] [email]
 * or via env vars:
 *   ADMIN_USERNAME=... ADMIN_PASSWORD=... ADMIN_NAME=... ADMIN_EMAIL=... npx ts-node scripts/create-admin.ts
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const SYSTEM_ADMIN_USER_TYPE_ID = 3; // src/common/constants/user-types.ts
const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  const [, , argUsername, argPassword, argName, argEmail] = process.argv;

  const username = (argUsername ?? process.env.ADMIN_USERNAME ?? '').trim().toLowerCase();
  const password = argPassword ?? process.env.ADMIN_PASSWORD ?? '';
  const name = (argName ?? process.env.ADMIN_NAME ?? username).trim();
  const email = (argEmail ?? process.env.ADMIN_EMAIL ?? '').trim() || null;

  if (username.length < 3 || username.length > 50) {
    fail('Username must be 3-50 characters (pass it as the first argument or ADMIN_USERNAME).');
  }
  if (password.length < 8 || password.length > 128 || !PASSWORD_PATTERN.test(password)) {
    fail(
      'Password must be 8-128 characters and contain upper, lower, digit, and special characters ' +
        '(pass it as the second argument or ADMIN_PASSWORD).',
    );
  }

  const userType = await prisma.userType.findUnique({ where: { id: SYSTEM_ADMIN_USER_TYPE_ID } });
  if (!userType) {
    fail(
      `UserType ${SYSTEM_ADMIN_USER_TYPE_ID} (System Admin) does not exist yet. Run "npm run prisma:seed" first.`,
    );
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    fail(`Username "${username}" already exists (user id ${existing.id}). Pick a different username.`);
  }

  const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash(password, bcryptRounds);

  const { user, profile } = await prisma.$transaction(async (tx) => {
    const profile = await tx.profile.create({
      data: { name, email, isSiteAccess: true },
    });
    const user = await tx.user.create({
      data: {
        username,
        passwordHash,
        userTypeId: SYSTEM_ADMIN_USER_TYPE_ID,
        profileId: profile.id,
        isActive: true,
        // Typed in by whoever ran this script, not an admin-generated temp
        // password, so there is no need to force an immediate change.
        mustChangePassword: false,
      },
    });
    return { user, profile };
  });

  console.log(`Created System Administrator "${user.username}" (user id ${user.id}, profile id ${profile.id}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
