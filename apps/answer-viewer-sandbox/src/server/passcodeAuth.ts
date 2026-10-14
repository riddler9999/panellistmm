import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { db } from './pocketHrData.js';
import type { Principal } from './consultationAccess.js';

type Account = { id: string; email: string; role: 'Admin'|'User'; pin_hash: string; disabled_at: string|null; failed_attempts: number; locked_until: string|null };
const digest = (token: string) => createHash('sha256').update(token).digest('hex');
const enc = (value: string) => encodeURIComponent(value);

export function hashPasscode(pin: string): string {
 if (!/^\d{4}$/.test(pin)) throw new Error('invalid_passcode');
 const salt = randomBytes(16).toString('hex');
 return 'scrypt:' + salt + ':' + scryptSync(pin, salt, 32).toString('hex');
}
export function verifyPasscode(pin: string, stored: string): boolean {
 const [scheme, salt, hash] = stored.split(':');
 if (!/^\d{4}$/.test(pin) || scheme !== 'scrypt' || !/^[0-9a-f]{32}$/.test(salt ?? '') || !/^[0-9a-f]{64}$/.test(hash ?? '')) return false;
 const expected = Buffer.from(hash, 'hex');
 return timingSafeEqual(scryptSync(pin, salt, 32), expected);
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
 const permitted = await db<boolean>('rpc/pocket_hr_allow_login_attempt','POST',{p_email_digest:digest(normalized)});
 if (permitted !== true) return null;
 const rows = await db<Account[]>('pocket_hr_accounts?select=*&email=eq.' + enc(normalized) + '&limit=2');
 if (rows.length !== 1) return null;
 const account = rows[0];
 if (account.disabled_at || (account.locked_until && Date.parse(account.locked_until) > Date.now())) return null;
 if (!verifyPasscode(pin, account.pin_hash)) {
  await db('rpc/pocket_hr_record_pin_attempt','POST',{p_account_id:account.id,p_success:false});
  return null;
 }
 const accepted = await db<boolean>('rpc/pocket_hr_record_pin_attempt','POST',{p_account_id:account.id,p_success:true});
 if (!accepted) return null;
 const token = randomBytes(32).toString('hex');
 await db('pocket_hr_sessions', 'POST', { token_digest: digest(token), account_id: account.id, expires_at: new Date(Date.now()+86400000).toISOString() });
 return token;
}
export async function authenticatedPrincipal(headers: Record<string,string|string[]|undefined>): Promise<Principal|null> {
 const token = cookieToken(headers);
 if (!token) return null;
 const sessions = await db<Array<{account_id:string; expires_at:string;revoked_at:string|null}>>('pocket_hr_sessions?select=account_id,expires_at,revoked_at&token_digest=eq.' + digest(token) + '&limit=1');
 if (sessions.length !== 1 || sessions[0].revoked_at !== null || Date.parse(sessions[0].expires_at) <= Date.now()) return null;
 const accounts = await db<Array<Pick<Account,'email'|'role'|'disabled_at'>>>('pocket_hr_accounts?select=email,role,disabled_at&id=eq.' + enc(sessions[0].account_id) + '&limit=1');
 const account = accounts[0];
 if (!account || account.disabled_at !== null || !['Admin','User'].includes(account.role)) return null;
 return { email: account.email, role: account.role };
}
export async function revokeSession(headers: Record<string,string|string[]|undefined>): Promise<void> {
 const token = cookieToken(headers);
 if (token) await db('pocket_hr_sessions?token_digest=eq.' + digest(token), 'PATCH', { revoked_at: new Date().toISOString() });
}
