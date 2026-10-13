import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticatePin, authenticatedSession, parseSessionCookie, sessionCookie, verifiedIdentity } from './pocketHrAuth';

const saved = { ...process.env };
afterEach(() => { vi.unstubAllGlobals(); process.env = { ...saved }; });
function setup() {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'server-secret';
  process.env.SUPABASE_ANON_KEY = 'public-key';
  process.env.POCKET_HR_PIN_PEPPER = 'pepper';
}
describe('Pocket HR runtime security', () => {
  it('requires an email-confirmed Supabase Auth user, not client email', async () => {
    setup();
    const fetcher = vi.fn().mockResolvedValue({ ok:true, json:async()=>({id:'user-1',email:'a@example.com'}) });
    vi.stubGlobal('fetch',fetcher);
    expect(await verifiedIdentity('real-token')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await verifiedIdentity('')).toBeNull();
  });
  it('fails closed without a provisioned account', async () => {
    setup();
    const fetcher = vi.fn()
      .mockResolvedValueOnce({ok:true,json:async()=>({id:'user-1',email:'a@example.com',email_confirmed_at:'2026-10-14T00:00:00Z'})})
      .mockResolvedValueOnce({ok:true,json:async()=>([])});
    vi.stubGlobal('fetch',fetcher);
    expect(await authenticatePin('real-token','1234')).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('rejects expired and revoked sessions', async () => {
    setup();
    const account={id:'a',email:'a@example.com',role:'User',disabled_at:null};
    const fetcher=vi.fn().mockResolvedValueOnce({ok:true,json:async()=>[{account_id:'a',expires_at:'2020-01-01T00:00:00Z',revoked_at:null,pocket_hr_accounts:account}]})
      .mockResolvedValueOnce({ok:true,json:async()=>[{account_id:'a',expires_at:'2099-01-01T00:00:00Z',revoked_at:'2026-10-14T00:00:00Z',pocket_hr_accounts:account}]});
    vi.stubGlobal('fetch',fetcher);
    const token='A'.repeat(43);
    expect(await authenticatedSession(token)).toBeNull();
    expect(await authenticatedSession(token)).toBeNull();
  });
  it('sets secure embedded-session cookie attributes', () => {
    const cookie=sessionCookie('A'.repeat(43));
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=None');
    expect(parseSessionCookie('other=1; '+cookie.split(';')[0])).toBe('A'.repeat(43));
    expect(sessionCookie('',true)).toContain('Max-Age=0');
  });
});
