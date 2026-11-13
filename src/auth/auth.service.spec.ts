import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService, INVALID_LOGIN_MESSAGE } from './auth.service';
import { sha256 } from '../common/utils/crypto.util';

// Legacy DES decryption is mocked: the tests cover the migration logic (D-014), not the cipher.
jest.mock('../common/utils/crypto.util', () => {
  const actual = jest.requireActual('../common/utils/crypto.util');
  return { ...actual, desDecrypt: jest.fn() };
});
import { desDecrypt } from '../common/utils/crypto.util';

const NOW = new Date('2026-11-03T08:00:00Z');
const PAST = new Date('2026-11-03T07:00:00Z');
const FUTURE = new Date('2026-11-03T09:00:00Z');

function makePrisma() {
  return {
    user: { findUnique: jest.fn(), update: jest.fn().mockResolvedValue({}) },
    userActivity: {
      findUnique: jest.fn().mockResolvedValue(null),
      upsert: jest.fn().mockResolvedValue({}),
    },
    passwordResetToken: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
    },
    session: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
}

function makeSessions() {
  return {
    issue: jest.fn().mockResolvedValue({
      sessionId: BigInt(42),
      familyId: 'family-1',
      accessToken: 'access',
      refreshToken: 'refresh',
      expiresIn: 900,
    }),
    revokeOne: jest.fn().mockResolvedValue(true),
    revokeFamily: jest.fn().mockResolvedValue(undefined),
    revokeAll: jest.fn().mockResolvedValue(0),
  };
}

function makeSecurityConfig() {
  return {
    getMaxLoginAttempts: jest.fn().mockResolvedValue(5),
    getLockoutMinutes: jest.fn().mockResolvedValue(30),
    getSessionTimeoutMinutes: jest.fn().mockResolvedValue(180),
  };
}

function makeService(overrides: { prisma?: any; sessions?: any; securityConfig?: any } = {}) {
  const prisma = overrides.prisma ?? makePrisma();
  const sessions = overrides.sessions ?? makeSessions();
  const securityConfig = overrides.securityConfig ?? makeSecurityConfig();
  const config = {
    get: (key: string, fallback?: unknown) =>
      ({
        'app.security.bcryptRounds': 4,
        'app.frontendBaseUrl': 'https://hrms.example.test',
      } as Record<string, unknown>)[key] ?? fallback,
  };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const email = { send: jest.fn().mockResolvedValue(undefined) };
  const service = new AuthService(prisma as any, config as any, audit as any, email as any, sessions as any, securityConfig as any);
  return { service, prisma, sessions, audit, email, securityConfig };
}

function activeUser(passwordHash: string, extra: Record<string, unknown> = {}) {
  return {
    id: 7,
    profileId: 70,
    username: 'asha',
    userTypeId: 4,
    passwordHash,
    legacyPasswordEnc: null,
    mustChangePassword: false,
    isActive: true,
    profile: { isSiteAccess: true, name: 'Asha', email: 'asha@example.test' },
    activity: null,
    ...extra,
  };
}

describe('AuthService.login', () => {
  let hash: string;
  beforeAll(async () => {
    hash = await bcrypt.hash('Correct#Horse1', 4);
  });
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
    (desDecrypt as jest.Mock).mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('issues a session and clears any stale lock on success', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.user.findUnique.mockResolvedValue(
      activeUser(hash, { activity: { isLocked: true, lockedUntil: PAST, failedLoginAttempts: 5 } }),
    );

    const result = await service.login({ username: ' Asha ', password: 'Correct#Horse1' }, '10.0.0.1', 'ua');

    expect(prisma.user.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { username: 'asha' } }));
    expect(sessions.issue).toHaveBeenCalledWith(expect.objectContaining({ userId: 7, profileId: 70, userTypeId: 4 }));
    expect(result.accessToken).toBe('access');
    expect(result.mustChangePassword).toBe(false);
    expect(prisma.userActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ isLocked: false, lockedUntil: null, failedLoginAttempts: 0 }),
      }),
    );
  });

  it('answers an unknown username with the generic message and no session', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.login({ username: 'nobody', password: 'x' })).rejects.toThrow(
      new UnauthorizedException(INVALID_LOGIN_MESSAGE),
    );
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('refuses inactive, no-site-access and locked accounts with the same message', async () => {
    const cases = [
      activeUser(hash, { isActive: false }),
      activeUser(hash, { profile: { isSiteAccess: false, name: 'x', email: null } }),
      activeUser(hash, { activity: { isLocked: true, lockedUntil: FUTURE, failedLoginAttempts: 5 } }),
      activeUser(hash, { activity: { isLocked: true, lockedUntil: null, failedLoginAttempts: 5 } }),
    ];
    for (const user of cases) {
      const { service, prisma, sessions } = makeService();
      prisma.user.findUnique.mockResolvedValue(user);
      await expect(service.login({ username: 'asha', password: 'Correct#Horse1' })).rejects.toThrow(
        INVALID_LOGIN_MESSAGE,
      );
      expect(sessions.issue).not.toHaveBeenCalled();
      // Refused attempts are not counted: a locked account stays locked, not extended.
      expect(prisma.userActivity.upsert).not.toHaveBeenCalled();
    }
  });

  it('counts a wrong password and locks the account on the fifth failure', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(activeUser(hash));
    prisma.userActivity.findUnique.mockResolvedValue({ failedLoginAttempts: 4, lockedUntil: null });

    await expect(service.login({ username: 'asha', password: 'wrong' })).rejects.toThrow(INVALID_LOGIN_MESSAGE);

    expect(prisma.userActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          failedLoginAttempts: 5,
          isLocked: true,
          lockedUntil: new Date(NOW.getTime() + 30 * 60 * 1000),
        }),
      }),
    );
  });

  it('starts a fresh count once an earlier lock has expired', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(activeUser(hash));
    prisma.userActivity.findUnique.mockResolvedValue({ failedLoginAttempts: 5, lockedUntil: PAST });

    await expect(service.login({ username: 'asha', password: 'wrong' })).rejects.toThrow(INVALID_LOGIN_MESSAGE);

    expect(prisma.userActivity.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ failedLoginAttempts: 1, isLocked: false, lockedUntil: null }),
      }),
    );
  });

  it('accepts a legacy DES password once and forces a password change (D-014)', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.user.findUnique.mockResolvedValue(
      activeUser(null as unknown as string, { passwordHash: null, legacyPasswordEnc: 'legacy-blob' }),
    );
    (desDecrypt as jest.Mock).mockReturnValue('Legacy#Pass1');

    const result = await service.login({ username: 'asha', password: 'Legacy#Pass1' });

    expect(result.mustChangePassword).toBe(true);
    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { mustChangePassword: true } });
    expect(sessions.issue).toHaveBeenCalled();
  });
});

describe('AuthService.refresh', () => {
  const token = 'raw-refresh-token';
  const baseSession = {
    id: BigInt(10),
    userId: 7,
    familyId: 'family-1',
    familyStartedAt: PAST,
    revokedAt: null,
    rotatedAt: null,
    expiresAt: FUTURE,
  };
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('rotates the token and keeps the family and its start time', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session.findUnique.mockResolvedValue(baseSession);
    prisma.user.findUnique.mockResolvedValue(activeUser(null as unknown as string));

    await service.refresh(token);

    expect(prisma.session.findUnique).toHaveBeenCalledWith({ where: { refreshTokenHash: sha256(token) } });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { id: BigInt(10), rotatedAt: null, revokedAt: null },
      data: { rotatedAt: NOW, lastUsedAt: NOW },
    });
    expect(sessions.issue).toHaveBeenCalledWith(
      expect.objectContaining({ familyId: 'family-1', familyStartedAt: PAST }),
    );
  });

  it('revokes the whole family when a rotated token is replayed after the grace window', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      rotatedAt: new Date(NOW.getTime() - 5 * 60 * 1000),
    });

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    expect(sessions.revokeFamily).toHaveBeenCalledWith('family-1', 'rotated_token_reuse');
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('refuses a parallel retry inside the grace window without revoking the family', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session.findUnique.mockResolvedValue({
      ...baseSession,
      rotatedAt: new Date(NOW.getTime() - 2 * 1000),
    });

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    expect(sessions.revokeFamily).not.toHaveBeenCalled();
  });

  it('does not rotate when another request claimed the token first', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session.findUnique.mockResolvedValue(baseSession);
    prisma.user.findUnique.mockResolvedValue(activeUser(null as unknown as string));
    prisma.session.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    expect(sessions.issue).not.toHaveBeenCalled();
  });

  it('refuses an expired session', async () => {
    const { service, prisma } = makeService();
    prisma.session.findUnique.mockResolvedValue({ ...baseSession, expiresAt: PAST });

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
  });

  it('ends the session when the account has been deactivated', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session.findUnique.mockResolvedValue(baseSession);
    prisma.user.findUnique.mockResolvedValue(activeUser(null as unknown as string, { isActive: false }));

    await expect(service.refresh(token)).rejects.toThrow(UnauthorizedException);
    expect(sessions.revokeOne).toHaveBeenCalledWith(7, BigInt(10), 'account_unavailable');
  });
});

describe('AuthService password changes', () => {
  let hash: string;
  beforeAll(async () => {
    hash = await bcrypt.hash('Current#Pass1', 4);
  });
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('rejects a wrong current password', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(activeUser(hash));

    await expect(
      service.changePassword(7, BigInt(10), 'nope', 'New#Pass22', '1.2.3.4'),
    ).rejects.toThrow('Current password is incorrect');
  });

  it('rejects reusing the current password', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(activeUser(hash));

    await expect(
      service.changePassword(7, BigInt(10), 'Current#Pass1', 'Current#Pass1'),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('changes the password and signs out every other session but the current one', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue(activeUser(hash));

    await service.changePassword(7, BigInt(10), 'Current#Pass1', 'Brand#New2', '1.2.3.4');

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, revokedAt: null, id: { not: BigInt(10) } },
      data: { revokedAt: NOW, revokedReason: 'password_changed' },
    });
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(3);
    const { passwordHash, legacyPasswordEnc, mustChangePassword } = prisma.user.update.mock.calls[0][0].data;
    expect(await bcrypt.compare('Brand#New2', passwordHash)).toBe(true);
    expect(legacyPasswordEnc).toBeNull();
    expect(mustChangePassword).toBe(false);
  });
});

describe('AuthService.resetPassword', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('rejects an expired token', async () => {
    const { service, prisma } = makeService();
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 1, userId: 7, usedAt: null, expiresAt: PAST });

    await expect(service.resetPassword('tok', 'New#Pass22')).rejects.toThrow(UnauthorizedException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('resets, clears the lock and revokes all sessions in one transaction', async () => {
    const { service, prisma } = makeService();
    prisma.passwordResetToken.findUnique.mockResolvedValue({ id: 1, userId: 7, usedAt: null, expiresAt: FUTURE });
    prisma.user.findUnique.mockResolvedValue(activeUser(null as unknown as string));

    await service.resetPassword('tok', 'New#Pass22', '1.2.3.4');

    expect(prisma.passwordResetToken.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: sha256('tok') },
    });
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, revokedAt: null },
      data: { revokedAt: NOW, revokedReason: 'password_reset' },
    });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(4);
  });
});

describe('AuthService.forgotPassword', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
  afterEach(() => jest.useRealTimers());

  it('does nothing visible for an unknown address', async () => {
    const { service, prisma, email } = makeService();
    prisma.user.findFirst = jest.fn().mockResolvedValue(null);

    await service.forgotPassword('nobody@example.test');

    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
    expect(email.send).not.toHaveBeenCalled();
  });

  it('invalidates earlier links, stores only a hash, and emails the new link', async () => {
    const { service, prisma, email } = makeService();
    prisma.user.findFirst = jest
      .fn()
      .mockResolvedValue(activeUser(null as unknown as string));

    await service.forgotPassword('Asha@Example.test');

    expect(prisma.passwordResetToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, usedAt: null, expiresAt: { gt: NOW } },
      data: { expiresAt: NOW },
    });
    const created = prisma.passwordResetToken.create.mock.calls[0][0].data;
    expect(created.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(created.expiresAt.getTime()).toBe(NOW.getTime() + 60 * 60 * 1000);

    const sent = email.send.mock.calls[0][0];
    expect(sent.to).toBe('asha@example.test');
    expect(sent.text).toMatch(/https:\/\/hrms\.example\.test\/reset-password\?token=/);
  });
});

describe('AuthService.logout', () => {
  it('revokes only the presented, still-active session', async () => {
    const { service, prisma, sessions } = makeService();
    prisma.session = { ...prisma.session, findUnique: jest.fn().mockResolvedValue({
      id: BigInt(10),
      userId: 7,
      revokedAt: null,
      user: { profileId: 70 },
    }) };

    await service.logout('raw');

    expect(sessions.revokeOne).toHaveBeenCalledWith(7, BigInt(10), 'logout');
  });
});
