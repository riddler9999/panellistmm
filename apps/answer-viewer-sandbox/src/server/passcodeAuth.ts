import { randomBytes, createHash } from 'node:crypto';
import { db, readPasscodeAccounts } from './pocketHrData.js';
import type { Principal } from './consultationAccess.js';

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

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
export async function authenticate(pin: string, source = 'unknown'): Promise<string|null> {
 if (!/^\d{4}$/.test(pin)) return null;
 // Google Sheets is the authoritative source for active PINs and roles.
 const entries = await readPasscodeAccounts();
 const sourceKey = digest('source:' + source); 
 const sourceAllowed = await db<boolean>('rpc/pocket_hr_allow_login_attempt', 'POST', {p_email_digest:sourceKey});
 if (sourceAllowed !== true) return null;
 const matching = entries.filter(entry => entry.passcode === pin);
 if (matching.length === 1) {
  const accountAllowed = await db<boolean>('rpc/pocket_hr_allow_login_attempt', 'POST', {p_email_digest:digest('account:' + matching[0].email)});
  if (accountAllowed !== true) return null;
 }
 // Reject ambiguous PINs rather than choosing a user's account arbitrarily.
 if (matching.length !== 1 || entries.filter(entry => entry.email === matching[0].email).length !== 1) return null;
 const identity = matching[0];
 if (identity.status !== 'Active' || !['Admin','User'].includes(identity.role)) return null;
 const token = randomBytes(32).toString('hex');
 await db('pocket_hr_sessions', 'POST', {
  token_digest: digest(token),
  sheet_email: identity.email,
  expires_at: new Date(Date.now() + 86400000).toISOString()
 });
 return token;
}
export async function authenticatedPrincipal(headers: Record<string,string|string[]|undefined>): Promise<Principal|null> {
 const token = cookieToken(headers);
 if (!token) return null;
 const sessions = await db<Array<{sheet_email:string;expires_at:string;revoked_at:string|null}>>(
  'pocket_hr_sessions?select=sheet_email,expires_at,revoked_at&token_digest=eq.' + digest(token) + '&limit=1'
 );
 if (sessions.length !== 1 || sessions[0].revoked_at !== null || Date.parse(sessions[0].expires_at) <= Date.now()) return null;
 const email = sessions[0].sheet_email.trim().toLowerCase();
 const entries = await readPasscodeAccounts();
 const matches = entries.filter(entry => entry.email === email);
 if (matches.length !== 1 || matches[0].status !== 'Active' || !['Admin','User'].includes(matches[0].role)) return null;
 return { email, role: matches[0].role as Principal['role'] };
}
export async function revokeSession(headers: Record<string,string|string[]|undefined>): Promise<void> {
 const token = cookieToken(headers);
 if (token) await db('pocket_hr_sessions?token_digest=eq.' + digest(token), 'PATCH', { revoked_at: new Date().toISOString() });
}
