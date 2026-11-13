import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * System Admin > Security Configuration (planning/system_application_module.md §I).
 * Values live in SystemConfiguration, with the existing env vars as the fallback/seed
 * default. A short in-memory cache keeps this cheap on hot paths (session.service's
 * computeExpiry runs on every authenticated request), at the cost of up to 60s for an
 * admin change to take effect — acceptable for security thresholds, unlike e.g. a lockout
 * that must apply the instant it's raised.
 */
const CACHE_TTL_MS = 60_000;

@Injectable()
export class SecurityConfigService {
  private cache = new Map<string, { value: number; expiresAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async getNumber(configName: string, envKey: string, envDefault: number): Promise<number> {
    const cached = this.cache.get(configName);
    const now = Date.now();
    if (cached && cached.expiresAt > now) return cached.value;

    const row = await this.prisma.systemConfiguration.findUnique({ where: { name: configName } }).catch(() => null);
    const parsed = row?.value ? parseInt(row.value, 10) : NaN;
    const value = Number.isFinite(parsed) ? parsed : this.config.get<number>(envKey, envDefault);

    this.cache.set(configName, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  }

  getMaxLoginAttempts(): Promise<number> {
    return this.getNumber('Max Failed Login Attempts', 'app.security.maxLoginAttempts', 5);
  }

  getLockoutMinutes(): Promise<number> {
    return this.getNumber('Account Lockout Minutes', 'app.security.lockoutMinutes', 30);
  }

  getSessionTimeoutMinutes(): Promise<number> {
    return this.getNumber('Session Timeout Minutes', 'app.sessionIdleMinutes', 180);
  }
}
