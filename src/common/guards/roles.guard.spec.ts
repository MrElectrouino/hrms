import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from '../decorators/roles.decorator';
import { UserType } from '../constants/user-types';
import { RolesGuard } from './roles.guard';

class Target {
  @Roles(UserType.SystemAdmin)
  adminOnly() {}

  @Roles(UserType.SystemAdmin, UserType.HRAdmin)
  adminOrHr() {}

  @Roles()
  anyUser() {}

  unrestricted() {}
}

function contextFor(handler: keyof Target, user?: object): ExecutionContext {
  const request = { user };
  return {
    getHandler: () => Target.prototype[handler],
    getClass: () => Target,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

const guard = new RolesGuard(new Reflector());
const userOf = (userTypeId: number) => ({
  userId: 1,
  profileId: 1,
  userTypeId,
  sessionId: '1',
  mustChangePassword: false,
});

describe('RolesGuard', () => {
  it('allows a route with no @Roles() for any authenticated user', () => {
    expect(guard.canActivate(contextFor('unrestricted', userOf(UserType.Executive)))).toBe(true);
  });

  it('allows an empty @Roles() (explicit any-user) for an Executive', () => {
    expect(guard.canActivate(contextFor('anyUser', userOf(UserType.Executive)))).toBe(true);
  });

  it('allows System Administrators on admin-only routes', () => {
    expect(guard.canActivate(contextFor('adminOnly', userOf(UserType.SystemAdmin)))).toBe(true);
  });

  it('refuses HR Administrators on admin-only routes', () => {
    expect(() => guard.canActivate(contextFor('adminOnly', userOf(UserType.HRAdmin)))).toThrow(
      ForbiddenException,
    );
  });

  it('refuses Executives on HR-or-admin routes', () => {
    expect(() => guard.canActivate(contextFor('adminOrHr', userOf(UserType.Executive)))).toThrow(
      ForbiddenException,
    );
  });

  it('refuses when there is no authenticated user', () => {
    expect(() => guard.canActivate(contextFor('adminOnly', undefined))).toThrow(ForbiddenException);
  });
});
