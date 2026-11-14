import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { UserType } from '../constants/user-types';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { CurrentUserPayload } from '../decorators/current-user.decorator';
import { SessionService } from '../../auth/session.service';

export interface JwtPayload {
  sub: number; // user id
  sid: string; // session id
  profileId: number;
  userTypeId: number;
}

/**
 * Every request re-checks the user and session in the database (D-007, D-022),
 * so deactivation, password change and logout take effect immediately rather
 * than when the 15-minute access token expires.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('app.jwt.secret'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JwtPayload): Promise<CurrentUserPayload> {
    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: { select: { isSiteAccess: true } }, activity: true, branches: { select: { branchId: true } } },
    });
    if (!user || !user.isActive || !user.profile.isSiteAccess) {
      throw new UnauthorizedException();
    }
    if (user.activity?.isLocked && user.activity.lockedUntil && user.activity.lockedUntil > new Date()) {
      throw new UnauthorizedException();
    }

    const session = await this.sessions.touchAccessSession(BigInt(payload.sid), user.id);
    if (!session) {
      throw new UnauthorizedException();
    }

    // Branch scope: System Admins and unrestricted accounts see every branch.
    const branchAccess = user.userTypeId === UserType.SystemAdmin || user.allBranches ? null : user.branches.map((b) => b.branchId);
    // The header switcher can only narrow, never widen, what the account may access.
    const requested = Number(req.headers['x-branch-id']);
    const activeBranchIds =
      Number.isInteger(requested) && requested > 0 && (branchAccess === null || branchAccess.includes(requested))
        ? [requested]
        : branchAccess;

    return {
      userId: user.id,
      profileId: user.profileId,
      userTypeId: user.userTypeId,
      sessionId: payload.sid,
      mustChangePassword: user.mustChangePassword,
      branchAccess,
      activeBranchIds,
    };
  }
}
