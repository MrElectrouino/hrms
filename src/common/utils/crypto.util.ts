import { randomBytes, randomInt, createHash } from 'crypto';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateSecureToken(length = 32): string {
  let result = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return result;
}

const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SPECIAL = '!@#$%&*?';

/**
 * A random temporary password that meets the password rules (upper, lower, digit and special character).
 * Look-alike characters (0/O, 1/l/I) are left out so it can be read out or typed without mistakes.
 */
export function generateTemporaryPassword(length = 14): string {
  const all = UPPER + LOWER + DIGITS + SPECIAL;
  const pick = (set: string) => set[randomInt(set.length)];
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS), pick(SPECIAL)];
  while (chars.length < Math.max(length, 8)) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
