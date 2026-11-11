import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserType } from '../constants/user-types';
import { CurrentUserPayload } from '../decorators/current-user.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<UserType[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    // No @Roles() means "any authenticated user" (JwtAuthGuard already ran).
    if (!allowed || allowed.length === 0) return true;

    const user = context.switchToHttp().getRequest().user as CurrentUserPayload | undefined;
    if (!user || !allowed.includes(user.userTypeId)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    return true;
  }
}
