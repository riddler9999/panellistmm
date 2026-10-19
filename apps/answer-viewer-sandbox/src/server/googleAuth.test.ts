import { generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAccessToken, readPasscodeAccounts } from './pocketHrData';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('Google Sheet bridge configuration and account source separation', () => {
  const key = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({type:'pkcs8',format:'pem'}).toString();
  function configure() {
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL','test@test.iam.gserviceaccount.com');
    vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',key);
    vi.stubEnv('POCKET_HR_SHEET_ID','test-sheet');
  }
  it('rejects accidentally copied encrypted configuration before sending an assertion', async () => {
    configure(); vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL','eyJ2IjoidjIi');
    const fetcher=vi.fn(); vi.stubGlobal('fetch',fetcher);
    await expect(googleAccessToken()).rejects.toThrow('sheet_identity_invalid');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('loads PIN account identity from Supabase without calling Google Sheets', async () => {
    vi.stubEnv('SUPABASE_URL','https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-service-role');
    const fetcher=vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify([
      {id:'internal',email:'user@example.com',role:'User',pin_hash:'redacted',disabled_at:null,locked_until:null,display_name:'User'}
    ])));
    vi.stubGlobal('fetch',fetcher);
    await expect(readPasscodeAccounts()).resolves.toEqual([{email:'user@example.com',role:'User',status:'Active',name:'User'}]);
    expect(String(fetcher.mock.calls[0][0])).toContain('/rest/v1/pocket_hr_accounts');
    expect(String(fetcher.mock.calls[0][0])).not.toContain('sheets.googleapis.com');
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain('redacted');
  });
});
