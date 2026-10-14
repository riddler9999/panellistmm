import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, hashPasscode } from './passcodeAuth';
import login from '../../api/pocket-hr-login';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function setup(accounts: Array<Record<string, unknown>>) {
 vi.stubEnv('SUPABASE_URL', 'https://test.supabase.co');
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-key');
 const requested: string[] = [];
 vi.stubGlobal('fetch', vi.fn(async (url: string, options?: { body?: string }) => {
  requested.push(url);
  if (url.includes('pocket_hr_allow_login_attempt')) return { ok: true, json: async () => true };
  if (url.includes('pocket_hr_accounts')) return { ok: true, json: async () => accounts };
  if (url.includes('pocket_hr_record_pin_attempt')) return { ok: true, json: async () => true };
  if (url.includes('pocket_hr_sessions') && options?.body) return { ok: true, json: async () => [{ id: 'session' }] };
  throw new Error('unexpected request');
 }));
 return requested;
}
const account = (pin: string, id: string) => ({ id, email: id + '@example.com', role: 'Admin', pin_hash: hashPasscode(pin), disabled_at: null, failed_attempts: 0, locked_until: null });

describe('PIN-only authentication', () => {
 it('rejects missing PIN before private I/O', async () => {
  const fetchMock = vi.fn(); vi.stubGlobal('fetch', fetchMock);
  let status = 0; let payload: unknown;
  const res = { status(n: number) { status = n; return res; }, setHeader() {}, json(v: unknown) { payload = v; } };
  await login({ method: 'POST', body: {} }, res);
  expect(status).toBe(400); expect(payload).toEqual({ error: 'invalid_input' });
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('authenticates a unique stored scrypt PIN without contacting Google Sheets', async () => {
  const requests = setup([account('1234', 'one')]);
  const token = await authenticate('1234');
  expect(token).toMatch(/^[0-9a-f]{64}$/);
  expect(requests.some(x => x.includes('googleapis.com'))).toBe(false);
  expect(requests.some(x => x.includes('pocket_hr_sessions'))).toBe(true);
 });
 it('rejects wrong PIN without creating a session', async () => {
  const requests = setup([account('1234', 'one')]);
  expect(await authenticate('9999')).toBeNull();
  expect(requests.some(x => x.includes('pocket_hr_sessions'))).toBe(false);
 });
 it('rejects duplicate PIN across accounts without creating a session', async () => {
  const requests = setup([account('1234', 'one'), account('1234', 'two')]);
  expect(await authenticate('1234')).toBeNull();
  expect(requests.some(x => x.includes('pocket_hr_sessions'))).toBe(false);
 });
});
