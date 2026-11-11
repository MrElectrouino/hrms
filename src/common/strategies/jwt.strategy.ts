import { Injectable, UnauthorizedException } from '@nestjs/common';
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
    });
  }

  async validate(payload: JwtPayload): Promise<CurrentUserPayload> {
    if (!payload.sub || !payload.sid) {
      throw new UnauthorizedException();
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { profile: { select: { isSiteAccess: true } }, activity: true },
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

    return {
      userId: user.id,
      profileId: user.profileId,
      userTypeId: user.userTypeId,
      sessionId: payload.sid,
      mustChangePassword: user.mustChangePassword,
    };
  }
}
