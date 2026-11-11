import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { generateSecureToken, sha256 } from '../common/utils/crypto.util';

/** Access-token activity is written back at most this often (avoids a write per request). */
const ACTIVITY_TOUCH_INTERVAL_MS = 5 * 60 * 1000;

export interface IssuedSession {
  sessionId: bigint;
  familyId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface IssueSessionInput {
  userId: number;
  profileId: number;
  userTypeId: number;
  ip?: string;
  userAgent?: string;
  /** Set when rotating a refresh token, so the new session joins the same family. */
  familyId?: string;
  familyStartedAt?: Date;
}

/**
 * Owns login sessions (D-007, D-022): issuing, rotation, the per-request
 * check, and the list/revoke operations used by session management.
 *
 * Expiry rule: a session expires after SESSION_IDLE_MINUTES without activity,
 * and never later than REFRESH_TTL_DAYS after its family (login) started.
 */
@Injectable()
export class SessionService {
  private readonly accessTtlSeconds: number;
  private readonly refreshTtlDays: number;
  private readonly idleMinutes: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    config: ConfigService,
  ) {
    this.accessTtlSeconds = parseTtlSeconds(config.get<string>('app.jwt.accessTtl', '15m'));
    this.refreshTtlDays = config.get<number>('app.jwt.refreshTtlDays', 14);
    this.idleMinutes = config.get<number>('app.sessionIdleMinutes', 180);
  }

  get accessTokenLifetimeSeconds(): number {
    return this.accessTtlSeconds;
  }

  /** Expiry for a session that was just issued or used at `now`. */
  computeExpiry(familyStartedAt: Date, now: Date): Date {
    const idleEnd = new Date(now.getTime() + this.idleMinutes * 60 * 1000);
    const absoluteEnd = new Date(familyStartedAt.getTime() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
    return idleEnd < absoluteEnd ? idleEnd : absoluteEnd;
  }

  async issue(input: IssueSessionInput): Promise<IssuedSession> {
    const now = new Date();
    const familyId = input.familyId ?? randomUUID();
    const familyStartedAt = input.familyStartedAt ?? now;
    const refreshToken = generateSecureToken(48);

    const session = await this.prisma.session.create({
      data: {
        userId: input.userId,
        refreshTokenHash: sha256(refreshToken),
        familyId,
        familyStartedAt,
        issuedAt: now,
        lastUsedAt: now,
        expiresAt: this.computeExpiry(familyStartedAt, now),
        ipAddress: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });

    const accessToken = this.jwtService.sign(
      {
        sub: input.userId,
        sid: session.id.toString(),
        profileId: input.profileId,
        userTypeId: input.userTypeId,
      },
      { expiresIn: this.accessTtlSeconds },
    );

    return {
      sessionId: session.id,
      familyId,
      accessToken,
      refreshToken,
      expiresIn: this.accessTtlSeconds,
    };
  }

  /**
   * Called for every authenticated request. Returns the session if it is still
   * usable, otherwise null. Access tokens of a rotated session stay usable until
   * their own 15-minute expiry; only the refresh chain is re-checked.
   */
  async touchAccessSession(sessionId: bigint, userId: number) {
    const session = await this.prisma.session.findFirst({ where: { id: sessionId, userId } });
    const now = new Date();
    if (!session || session.revokedAt || session.expiresAt <= now) {
      return null;
    }

    const stale = now.getTime() - session.lastUsedAt.getTime() > ACTIVITY_TOUCH_INTERVAL_MS;
    if (stale && !session.rotatedAt) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: {
          lastUsedAt: now,
          expiresAt: this.computeExpiry(session.familyStartedAt, now),
        },
      });
    }
    return session;
  }

  async listActive(userId: number, currentSessionId: bigint) {
    const now = new Date();
    const sessions = await this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        rotatedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { lastUsedAt: 'desc' },
      select: {
        id: true,
        issuedAt: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAddress: true,
        userAgent: true,
      },
    });
    return sessions.map((s) => ({
      id: s.id.toString(),
      issuedAt: s.issuedAt,
      lastUsedAt: s.lastUsedAt,
      expiresAt: s.expiresAt,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      isCurrent: s.id === currentSessionId,
    }));
  }

  /** Revokes one session of this user. Returns false if it does not exist or is not theirs. */
  async revokeOne(userId: number, sessionId: bigint, reason: string): Promise<boolean> {
    const result = await this.prisma.session.updateMany({
      where: { id: sessionId, userId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count > 0;
  }

  /** Revokes every active session of a user, optionally keeping one. */
  async revokeAll(userId: number, reason: string, keepSessionId?: bigint): Promise<number> {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(keepSessionId !== undefined ? { id: { not: keepSessionId } } : {}),
      },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
    return result.count;
  }

  /** Revokes every session in a rotation family (theft response). */
  async revokeFamily(familyId: string, reason: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date(), revokedReason: reason },
    });
  }
}

/** Parses the subset of duration strings used in config: 900, 15m, 2h, 1d. */
export function parseTtlSeconds(ttl: string): number {
  const match = ttl.match(/^(\d+)([smhd])$/);
  if (!match) return 900;
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    case 'd':
      return value * 86400;
    default:
      return 900;
  }
}
