import { randomBytes, createHash, timingSafeEqual, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { db } from './pocketHrData.js';
import type { AuthenticatedPrincipal } from './consultationAccess.js';

const scrypt = promisify(scryptCallback);
const SESSION_SECONDS = 60 * 60 * 24 * 30;
const digest = (value: string) => createHash('sha256').update(value).digest('hex');

type Account = {
  id: string;
  email: string;
  role: string;
  pin_hash: string | null;
  disabled_at: string | null;
  locked_until: string | null;
};
type SessionRow = {
  expires_at: string;
  revoked_at: string | null;
  pocket_hr_accounts: Account | Account[] | null;
};

async function loginStage<T>(stage: string, operation: () => Promise<T>): Promise<T> {
  try { return await operation(); } catch (error) {
    const cause = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : error instanceof Error ? error.name : 'unknown';
    console.error('pocket_hr_login_stage_failed', { stage, cause });
    // Preserve only the allowlisted category; upstream messages may contain secrets.
    // eslint-disable-next-line preserve-caught-error -- Deliberately redact upstream errors.
    throw new Error('login_stage_' + stage, { cause: new Error(cause) });
  }
}

export function sessionCookie(token: string, maxAge = SESSION_SECONDS): string {
  return 'pocket_hr_session=' + token + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + maxAge;
}
export function clearSessionCookie(): string {
  return 'pocket_hr_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0';
}
export function cookieToken(headers: Record<string, string | string[] | undefined>): string | null {
  const cookie = headers.cookie;
  const raw = Array.isArray(cookie) ? cookie.join(';') : cookie ?? '';
  return raw.match(/(?:^|;\s*)pocket_hr_session=([0-9a-f]{64})(?:;|$)/)?.[1] ?? null;
}

async function verifyPin(pin: string, encoded: string | null): Promise<boolean> {
  const match = encoded?.match(/^scrypt:([0-9a-f]{32}):([0-9a-f]{64})$/);
  if (!match) return false;
  const expected = Buffer.from(match[2], 'hex');
  const actual = await scrypt(pin, Buffer.from(match[1], 'hex'), expected.length) as Buffer;
  return timingSafeEqual(actual, expected);
}

async function recordPinAttempt(accountId: string, success: boolean): Promise<boolean> {
  return loginStage('pin_attempt', async () => {
    const result = await db<boolean>('rpc/pocket_hr_record_pin_attempt', 'POST', {
      p_account_id: accountId,
      p_success: success,
    });
    return result === true;
  });
}

export async function authenticate(pin: string, source = 'unknown'): Promise<string | null> {
  if (!/^\d{4}$/.test(pin)) return null;
  const sourceDigest = digest('source:' + source.slice(0, 128));
  const allowed = await loginStage('source_limit', async () => {
    const result = await db<boolean>('rpc/pocket_hr_allow_scoped_login_attempt', 'POST', {
      p_digest: sourceDigest,
      p_max_attempts: 30,
    });
    return result === true;
  });
  if (!allowed) return null;

  const accounts = await loginStage('accounts', () => db<Account[]>(
    'pocket_hr_accounts?select=id,email,role,pin_hash,disabled_at,locked_until&order=id.asc&limit=1000',
  ));
  const active = accounts.filter(account =>
    account.disabled_at === null &&
    account.pin_hash !== null &&
    ['Admin', 'Consultant', 'User'].includes(account.role) &&
    (!account.locked_until || Date.parse(account.locked_until) <= Date.now()),
  );

  const matches: Account[] = [];
  for (const account of active) if (await verifyPin(pin, account.pin_hash)) matches.push(account);
  if (matches.length !== 1) {
    // PIN-only login cannot identify an account from a wrong PIN. Apply the
    // existing account lockout RPC only when there is exactly one eligible
    // account; the source scoped limit always applies in every case.
    if (active.length === 1) await recordPinAttempt(active[0].id, false);
    return null;
  }
  const account = matches[0];
  if (accounts.filter(candidate => candidate.email.trim().toLowerCase() === account.email.trim().toLowerCase()).length !== 1) return null;
  if (!await recordPinAttempt(account.id, true)) return null;

  const token = randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_SECONDS * 1000).toISOString();
  await loginStage('session_create', async () => {
    await db('pocket_hr_sessions', 'POST', {
      account_id: account.id,
      token_digest: digest(token),
      expires_at: expiresAt,
    });
  });
  return token;
}

function accountFromSession(row: SessionRow): Account | null {
  const linked = row.pocket_hr_accounts;
  if (Array.isArray(linked)) return linked.length === 1 ? linked[0] : null;
  return linked && typeof linked === 'object' ? linked : null;
}

export async function authenticatedPrincipal(
  headers: Record<string, string | string[] | undefined>,
): Promise<AuthenticatedPrincipal | null> {
  const token = cookieToken(headers);
  if (!token) return null;
  const rows = await db<SessionRow[]>(
    'pocket_hr_sessions?select=expires_at,revoked_at,pocket_hr_accounts(id,email,role,pin_hash,disabled_at,locked_until)&token_digest=eq.' +
    digest(token) + '&limit=2',
  );
  if (rows.length !== 1) return null;
  const session = rows[0];
  const account = accountFromSession(session);
  if (!account || session.revoked_at || Date.parse(session.expires_at) <= Date.now()) return null;
  if (account.disabled_at || !account.pin_hash || !['Admin', 'Consultant', 'User'].includes(account.role)) return null;
  if (account.locked_until && Date.parse(account.locked_until) > Date.now()) return null;
  return {
    accountId: account.id,
    email: account.email.trim().toLowerCase(),
    role: account.role as AuthenticatedPrincipal['role'],
  };
}

export async function revokeSession(headers: Record<string, string | string[] | undefined>): Promise<void> {
  const token = cookieToken(headers);
  if (!token) return;
  await db(
    'pocket_hr_sessions?token_digest=eq.' + digest(token) + '&revoked_at=is.null',
    'PATCH',
    { revoked_at: new Date().toISOString() },
  );
}

/** Revoke all sessions for a disabled/reset account without changing its PIN. */
export async function invalidateAccountSessions(email: string): Promise<void> {
  const accounts = await db<Array<{ id: string }>>(
    'pocket_hr_accounts?select=id&email=eq.' + encodeURIComponent(email.trim().toLowerCase()) + '&limit=2',
  );
  if (accounts.length !== 1) return;
  await db('pocket_hr_sessions?account_id=eq.' + encodeURIComponent(accounts[0].id) + '&revoked_at=is.null', 'PATCH', {
    revoked_at: new Date().toISOString(),
  });
}
