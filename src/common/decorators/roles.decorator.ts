import { SetMetadata } from '@nestjs/common';
import { UserType } from '../constants/user-types';

export const ROLES_KEY = 'roles';

/**
 * Restricts a route to the given user types (D-022). Checked by RolesGuard,
 * which runs after JwtAuthGuard, so req.user is already populated.
 */
export const Roles = (...userTypes: UserType[]) => SetMetadata(ROLES_KEY, userTypes);
