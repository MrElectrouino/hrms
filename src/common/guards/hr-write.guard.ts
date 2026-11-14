import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { UserType } from '../constants/user-types';

const READ_ONLY = new Set(['GET', 'HEAD', 'OPTIONS']);
export const HR_USER_TYPES: number[] = [UserType.SystemAdmin, UserType.HRAdmin];

/**
 * Reference data and employee records can be read by signed-in users, but only HR Admin and
 * System Admin may create, change or delete them. Put it after JwtAuthGuard.
 */
@Injectable()
export class HrWriteGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (READ_ONLY.has(String(req.method).toUpperCase())) return true;
    const user = req.user as CurrentUserPayload | undefined;
    if (user && HR_USER_TYPES.includes(user.userTypeId)) return true;
    throw new ForbiddenException('Only HR or System Admin can make this change');
  }
}
