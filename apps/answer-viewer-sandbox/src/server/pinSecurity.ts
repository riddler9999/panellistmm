import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const PIN_PATTERN = /^[0-9]{4}$/;
const KEY_BYTES = 32;

export function isValidPin(pin: unknown): pin is string {
  return typeof pin === 'string' && PIN_PATTERN.test(pin);
}

// A server-held pepper is required: four-digit PINs have only 10,000 possibilities.
export async function hashPin(pin: string, pepper: string): Promise<string> {
  if (!isValidPin(pin) || !pepper) throw new Error('invalid_pin_configuration');
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(pin + pepper, salt, KEY_BYTES)) as Buffer;
  return `scrypt:${salt}:${hash.toString('hex')}`;
}

export async function verifyPin(pin: unknown, encoded: string, pepper: string): Promise<boolean> {
  if (!isValidPin(pin) || !pepper) return false;
  const parts = encoded.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[0-9a-f]{32}$/.test(parts[1]) || !/^[0-9a-f]{64}$/.test(parts[2])) return false;
  const actual = (await scrypt(pin + pepper, parts[1], KEY_BYTES)) as Buffer;
  return timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
}

export function newSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sessionTokenDigest(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
