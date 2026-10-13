import { verifyPin, newSessionToken, sessionTokenDigest, SESSION_LIFETIME_MS, isValidPin } from './pinSecurity';

const config = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_ANON_KEY;
  const pepper = process.env.POCKET_HR_PIN_PEPPER;
  if (!url || !key || !anon || !pepper) throw new Error('authentication_not_configured');
  return { url: url.replace(/\/$/, ''), key, anon, pepper };
};
type Account = { id: string; email: string; role: 'Admin' | 'User'; external_subject: string; identity_provider: string; pin_hash: string | null; locked_until: string | null; disabled_at: string | null };
type Session = { account_id: string; expires_at: string; revoked_at: string | null; pocket_hr_accounts: Account };
const api = async (path: string, method = 'GET', body?: unknown) => {
  const { url, key } = config();
  const response = await fetch(url + '/rest/v1/' + path, {
    method, headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store'
  });
  if (!response.ok) throw new Error('authentication_storage_unavailable');
  return response.json();
};
const queryValue = (value: string) => encodeURIComponent(value);
export async function verifiedIdentity(bearer: string): Promise<{ id: string; email: string } | null> {
  if (!bearer || bearer.length > 4096) return null;
  const { url, anon } = config();
  const response = await fetch(url + '/auth/v1/user', { headers: { apikey: anon, Authorization: 'Bearer ' + bearer }, cache: 'no-store' });
  if (!response.ok) return null;
  const user = await response.json() as { id?: string; email?: string; email_confirmed_at?: string };
  if (!user.id || !user.email || !user.email_confirmed_at) return null;
  return { id: user.id, email: user.email.trim().toLowerCase() };
}
export async function authenticatePin(bearer: string, pin: unknown): Promise<string | null> {
  const identity = await verifiedIdentity(bearer);
  if (!identity) return null;
  const rows = await api('pocket_hr_accounts?select=*&identity_provider=eq.verified_admin_provisioning&external_subject=eq.' + queryValue(identity.id) + '&limit=2') as Account[];
  if (rows.length !== 1 || rows[0].email !== identity.email || rows[0].disabled_at || !rows[0].pin_hash) return null;
  const account = rows[0];
  const now = Date.now();
  if (account.locked_until && Date.parse(account.locked_until) > now) return null;
  const valid = isValidPin(pin) && await verifyPin(pin, account.pin_hash!, config().pepper);
  // The database function serializes attempt counters and rejects concurrent lockout bypass.
  const attempt = await api('rpc/pocket_hr_record_pin_attempt', 'POST', { p_account_id: account.id, p_success: valid });
  if (attempt !== true) return null;
  const token = newSessionToken();
  await api('pocket_hr_sessions', 'POST', {
    account_id: account.id, token_digest: sessionTokenDigest(token),
    expires_at: new Date(Date.now() + SESSION_LIFETIME_MS).toISOString()
  });
  return token;
}
export async function authenticatedSession(token: string | undefined): Promise<{ email: string; role: 'Admin' | 'User'; accountId: string } | null> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const sessions = await api('pocket_hr_sessions?select=account_id,expires_at,revoked_at,pocket_hr_accounts(id,email,role,disabled_at)&token_digest=eq.' + sessionTokenDigest(token) + '&limit=2') as Session[];
  if (sessions.length !== 1) return null;
  const s = sessions[0], a = s.pocket_hr_accounts;
  if (s.revoked_at || Date.parse(s.expires_at) <= Date.now() || !a || a.disabled_at || !['Admin', 'User'].includes(a.role)) return null;
  return { email: a.email, role: a.role, accountId: s.account_id };
}
export async function revokeSession(token: string | undefined): Promise<void> {
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return;
  await api('pocket_hr_sessions?token_digest=eq.' + sessionTokenDigest(token), 'PATCH', { revoked_at: new Date().toISOString() });
}
export const cookieName = 'pocket_hr_session';
export function parseSessionCookie(cookie: string | undefined): string | undefined {
  const match = cookie?.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='));
  return match?.slice(cookieName.length + 1);
}
export function sessionCookie(token: string, clear = false): string {
  // Embedded in Glide (cross-site iframe): requires Secure + SameSite=None; browser may still block third-party cookies.
  return cookieName + '=' + (clear ? '' : token) + '; Path=/; HttpOnly; Secure; SameSite=None; ' + (clear ? 'Max-Age=0' : 'Max-Age=2592000');
}
