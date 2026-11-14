import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: number;
  profileId: number;
  userTypeId: number;
  /** Session the access token was issued for (decimal string of Session.id). */
  sessionId: string;
  /** True while the user must set a new password before using the app (D-014). */
  mustChangePassword: boolean;
  /** Branches this account may work in. null = every branch (System Admins and unrestricted accounts). */
  branchAccess: number[] | null;
  /**
   * Branches the current screen is scoped to: the header branch switcher (X-Branch-Id), clamped to
   * branchAccess. null = no branch filter. Use for lists; use branchAccess for per-record checks.
   */
  activeBranchIds: number[] | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as CurrentUserPayload;
  },
);
