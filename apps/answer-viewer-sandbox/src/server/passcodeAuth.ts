import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './pocketHrData';
import type { Principal } from './consultationAccess';

type Account = { id: string; email: string; role: 'Admin'|'User'; passcode_hash: string; enabled: boolean; failed_attempts: number; locked_until: string|null };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const enc = (value: string) => encodeURIComponent(value);

export function hashPasscode(pin: string): string {
 if (!/^\d{4}$/.test(pin)) throw new Error('invalid_passcode');
 const salt = randomBytes(16).toString('hex');
 return salt + ':' + scryptSync(pin, salt, 64).toString('hex');
}
export function verifyPasscode(pin: string, stored: string): boolean {
 const [salt, hash] = stored.split(':');
 if (!/^\d{4}$/.test(pin) || !salt || !/^[0-9a-f]{128}$/.test(hash ?? '')) return false;
 const expected = Buffer.from(hash, 'hex');
 return timingSafeEqual(scryptSync(pin, salt, 64), expected);
}
export function sessionCookie(token: string, maxAge = 86400): string {
 return 'pocket_hr_session=' + token + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + maxAge;
}
export function clearSessionCookie(): string { return 'pocket_hr_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'; }
export function cookieToken(headers: Record<string,string|string[]|undefined>): string | null {
 const cookie = headers.cookie;
 const raw = Array.isArray(cookie) ? cookie.join(';') : cookie ?? '';
 const token = raw.match(/(?:^|;\s*)pocket_hr_session=([0-9a-f]{64})(?:;|$)/)?.[1];
 return token ?? null;
}
export async function authenticate(email: string, pin: string): Promise<string|null> {
 const normalized = email.trim().toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || !/^\d{4}$/.test(pin)) return null;
 const rows = await db<Account[]>('pocket_hr_accounts?select=*&email=eq.' + enc(normalized) + '&limit=2');
 if (rows.length !== 1) return null;
 const account = rows[0];
 if (!account.enabled || (account.locked_until && Date.parse(account.locked_until) > Date.now())) return null;
 if (!verifyPasscode(pin, account.passcode_hash)) {
  const attempts = account.failed_attempts + 1;
  await db('pocket_hr_accounts?id=eq.' + enc(account.id), 'PATCH', { failed_attempts: attempts, locked_until: attempts >= 5 ? new Date(Date.now() + 15*60*1000).toISOString() : null });
  return null;
 }
 await db('pocket_hr_accounts?id=eq.' + enc(account.id), 'PATCH', { failed_attempts: 0, locked_until: null });
 const token = randomBytes(32).toString('hex');
 await db('pocket_hr_sessions', 'POST', { token_hash: digest(token), account_id: account.id, expires_at: new Date(Date.now()+86400000).toISOString() });
 return token;
}
export async function authenticatedPrincipal(headers: Record<string,string|string[]|undefined>): Promise<Principal|null> {
 const token = cookieToken(headers);
 if (!token) return null;
 const sessions = await db<Array<{account_id:string; expires_at:string}>>('pocket_hr_sessions?select=account_id,expires_at&token_hash=eq.' + digest(token) + '&limit=1');
 if (sessions.length !== 1 || Date.parse(sessions[0].expires_at) <= Date.now()) return null;
 const accounts = await db<Array<Pick<Account,'email'|'role'|'enabled'>>>('pocket_hr_accounts?select=email,role,enabled&id=eq.' + enc(sessions[0].account_id) + '&limit=1');
 const account = accounts[0];
 if (!account?.enabled || !['Admin','User'].includes(account.role)) return null;
 return { email: account.email, role: account.role };
}
export async function revokeSession(headers: Record<string,string|string[]|undefined>): Promise<void> {
 const token = cookieToken(headers);
 if (token) await db('pocket_hr_sessions?token_hash=eq.' + digest(token), 'DELETE');
}
