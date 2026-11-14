import { randomBytes, createHash } from 'crypto';

const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function generateSecureToken(length = 32): string {
  let result = '';
  const bytes = randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[bytes[i] % ALPHANUMERIC.length];
  }
  return result;
}

export function sha256(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}
