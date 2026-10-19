import { afterEach, describe, expect, it, vi } from 'vitest';
import { randomBytes, scryptSync, createHash } from 'node:crypto';
import { authenticate, authenticatedPrincipal, revokeSession, sessionCookie } from './passcodeAuth';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });

const account = {
  id: '00000000-0000-4000-8000-000000000001',
  email: 'a@example.com',
  role: 'User',
  pin_hash: '',
  disabled_at: null as string | null,
  locked_until: null as string | null,
};
const hashPin = (pin: string) => {
  const salt = randomBytes(16);
  return 'scrypt:' + salt.toString('hex') + ':' + scryptSync(pin, salt, 32).toString('hex');
};

function setup(pin = '1234') {
  vi.stubEnv('SUPABASE_URL', 'https://supabase.example.test');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key');
  vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
  account.pin_hash = hashPin(pin);
  account.disabled_at = null;
  account.locked_until = null;
  const sessions = new Map<string, { account_id: string; expires_at: string; revoked_at: string | null }>();
  const limits = new Map<string, number>();
  let failedAttempts = 0;
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const path = url.pathname.replace('/rest/v1/', '');
    const body = init?.body ? JSON.parse(String(init.body)) as Record<string, unknown> : {};
    if (path === 'rpc/pocket_hr_allow_scoped_login_attempt') {
      const key = String(body.p_digest);
      const count = (limits.get(key) ?? 0) + 1;
      limits.set(key, count);
      return Response.json(count <= Number(body.p_max_attempts));
    }
    if (path === 'rpc/pocket_hr_record_pin_attempt') {
      if (body.p_success === true) { failedAttempts = 0; account.locked_until = null; return Response.json(true); }
      failedAttempts++;
      if (failedAttempts >= 5) account.locked_until = new Date(Date.now() + 15 * 60_000).toISOString();
      return Response.json(false);
    }
    if (path === 'pocket_hr_accounts') return Response.json([account]);
    if (path === 'pocket_hr_sessions' && init?.method === 'POST') {
      sessions.set(String(body.token_digest), { account_id: String(body.account_id), expires_at: String(body.expires_at), revoked_at: null });
      return Response.json([]);
    }
    if (path === 'pocket_hr_sessions' && init?.method === 'GET') {
      const digest = url.searchParams.get('token_digest')?.replace('eq.', '') ?? '';
      const session = sessions.get(digest);
      if (!session) return Response.json([]);
      const linked = session.account_id === account.id ? account : null;
      return Response.json([{ expires_at: session.expires_at, revoked_at: session.revoked_at, pocket_hr_accounts: linked }]);
    }
    if (path === 'pocket_hr_sessions' && init?.method === 'PATCH') {
      const digest = url.searchParams.get('token_digest')?.replace('eq.', '');
      const session = sessions.get(digest ?? '');
      if (session) session.revoked_at = String(body.revoked_at);
      return Response.json([]);
    }
    throw new Error('unexpected Supabase test route: ' + path);
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, sessions, limits, account };
}

describe('Supabase PIN authentication', () => {
  it('accepts the existing PIN hash and creates an opaque, expiring database session', async () => {
    const { fetchMock, sessions } = setup();
    const token = await authenticate('1234', '203.0.113.8');
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions.get(createHash('sha256').update(token!).digest('hex'))?.account_id).toBe(account.id);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('sheets.googleapis.com'))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes('example.upstash.io'))).toBe(false);
  });

  it('rejects invalid PINs and locks the single PIN-only account after five failures', async () => {
    const { account } = setup();
    for (let i = 0; i < 5; i++) expect(await authenticate('9999', '198.51.100.2')).toBeNull();
    expect(account.locked_until).not.toBeNull();
    expect(await authenticate('1234', '198.51.100.2')).toBeNull();
  });

  it('applies the existing database scoped rate limit', async () => {
    const { limits } = setup();
    for (let i = 0; i < 30; i++) expect(await authenticate('9999', '203.0.113.9')).toBeNull();
    expect(await authenticate('1234', '203.0.113.9')).toBeNull();
    expect([...limits.values()][0]).toBe(31);
  });

  it('binds a live session to the stored account role and rejects expired or revoked sessions', async () => {
    const { sessions } = setup();
    const token = await authenticate('1234');
    const headers = { cookie: sessionCookie(token!) };
    expect(await authenticatedPrincipal(headers)).toMatchObject({ accountId: account.id, email: account.email, role: 'User' });
    const digest = createHash('sha256').update(token!).digest('hex');
    sessions.get(digest)!.expires_at = new Date(Date.now() - 1).toISOString();
    expect(await authenticatedPrincipal(headers)).toBeNull();
    sessions.get(digest)!.expires_at = new Date(Date.now() + 60_000).toISOString();
    await revokeSession(headers);
    expect(await authenticatedPrincipal(headers)).toBeNull();
  });

  it('uses the account role for Consultant authorization and rejects disabled accounts', async () => {
    const { account } = setup();
    account.role = 'Consultant';
    const token = await authenticate('1234');
    expect(await authenticatedPrincipal({ cookie: sessionCookie(token!) })).toMatchObject({ role: 'Consultant' });
    account.disabled_at = new Date().toISOString();
    expect(await authenticatedPrincipal({ cookie: sessionCookie(token!) })).toBeNull();
  });
});
