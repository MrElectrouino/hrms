import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UsersService } from './users.service';
import { UserType } from '../common/constants/user-types';

const actor = (userId: number, userTypeId: number) => ({
  userId,
  profileId: 900 + userId,
  userTypeId,
  sessionId: '1',
  mustChangePassword: false,
});

function makeService(target: Record<string, unknown> | null, opts: { otherAdmins?: number } = {}) {
  const prisma: any = {
    user: {
      findUnique: jest.fn().mockResolvedValue(target),
      update: jest.fn().mockResolvedValue({ id: target?.id, isActive: false }),
      count: jest.fn().mockResolvedValue(opts.otherAdmins ?? 1),
      findFirst: jest.fn(),
    },
    userType: { findUnique: jest.fn().mockResolvedValue({ id: 1 }) },
    session: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    userActivity: { upsert: jest.fn().mockResolvedValue({}) },
    profile: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  const config = { get: (_k: string, fallback?: unknown) => fallback };
  const audit = { log: jest.fn().mockResolvedValue(undefined) };
  const sessions = { revokeAll: jest.fn().mockResolvedValue(2) };
  return {
    service: new UsersService(prisma, config as any, audit as any, sessions as any),
    prisma,
    audit,
    sessions,
  };
}

const regularUser = { id: 20, userTypeId: UserType.Executive, isActive: true };
const adminUser = { id: 3, userTypeId: UserType.SystemAdmin, isActive: true };

describe('UsersService.update', () => {
  it('refuses to deactivate your own account', async () => {
    const { service } = makeService({ id: 5, userTypeId: UserType.HRAdmin, isActive: true });
    await expect(service.update(5, { isActive: false }, actor(5, UserType.HRAdmin))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('revokes every session of a deactivated user in the same transaction', async () => {
    const { service, prisma } = makeService(regularUser);

    await service.update(20, { isActive: false }, actor(5, UserType.HRAdmin));

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 20, revokedAt: null },
      data: expect.objectContaining({ revokedReason: 'user_deactivated' }),
    });
  });

  it('lets an HR Administrator deactivate a regular user', async () => {
    const { service } = makeService(regularUser);
    await expect(service.update(20, { isActive: false }, actor(5, UserType.HRAdmin))).resolves.toBeDefined();
  });

  it('stops HR Administrators from touching System Administrator accounts', async () => {
    const { service } = makeService(adminUser);
    await expect(service.update(3, { isActive: false }, actor(5, UserType.HRAdmin))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('stops HR Administrators from granting the System Administrator role', async () => {
    const { service } = makeService(regularUser);
    await expect(
      service.update(20, { userTypeId: UserType.SystemAdmin }, actor(5, UserType.HRAdmin)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('will not deactivate the last active System Administrator', async () => {
    const { service } = makeService(adminUser, { otherAdmins: 0 });
    await expect(service.update(3, { isActive: false }, actor(4, UserType.SystemAdmin))).rejects.toThrow(
      ConflictException,
    );
  });
});

describe('UsersService.create', () => {
  it('rejects a duplicate username', async () => {
    const { service, prisma } = makeService(null);
    prisma.user.findUnique.mockResolvedValueOnce({ id: 9 });

    await expect(
      service.create(
        { username: 'Asha', password: 'Passw0rd!x', userTypeId: 1 } as any,
        actor(5, UserType.HRAdmin),
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('creates the user with a temporary password that must be changed at sign-in', async () => {
    const { service, prisma } = makeService(null);
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.profile.create.mockResolvedValue({ id: 77 });
    prisma.user.create = jest.fn().mockResolvedValue({ id: 30, username: 'asha' });

    await service.create(
      { username: 'Asha', password: 'Passw0rd!x', userTypeId: 1 } as any,
      actor(5, UserType.HRAdmin),
    );

    expect(prisma.user.create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ username: 'asha', mustChangePassword: true, profileId: 77 }),
    );
  });

  it('only a System Administrator may create another System Administrator', async () => {
    const { service } = makeService(null);
    await expect(
      service.create({ username: 'root2', password: 'Passw0rd!x', userTypeId: 3 } as any, actor(5, UserType.HRAdmin)),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('UsersService.resetPassword', () => {
  it('signs the user out everywhere and requires a change at next login', async () => {
    const { service, prisma } = makeService(regularUser);
    prisma.user.update = jest.fn().mockResolvedValue({});

    await service.resetPassword(20, 'Temp#Pass1', actor(5, UserType.HRAdmin));

    expect(prisma.user.update.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ legacyPasswordEnc: null, mustChangePassword: true }),
    );
    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: { userId: 20, revokedAt: null },
      data: expect.objectContaining({ revokedReason: 'admin_password_reset' }),
    });
  });

  it('refuses to reset your own password through the admin route', async () => {
    const { service } = makeService({ id: 5, userTypeId: UserType.HRAdmin, isActive: true });
    await expect(service.resetPassword(5, 'Temp#Pass1', actor(5, UserType.HRAdmin))).rejects.toThrow(
      ForbiddenException,
    );
  });
});
