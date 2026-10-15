import { generateKeyPairSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { googleAccessToken, readPasscodeAccounts } from './pocketHrData';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('Google account configuration and diagnostics', () => {
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
  it('records only safe status and reason codes for a Sheets API failure', async () => {
    configure(); const log=vi.spyOn(console,'error').mockImplementation(()=>{});
    vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({access_token:'secret-token'})))
      .mockResolvedValueOnce(new Response(JSON.stringify({error:{status:'PERMISSION_DENIED',message:'secret upstream data',details:[{reason:'SERVICE_DISABLED'},{reason:'secret'}]}}),{status:403})));
    await expect(readPasscodeAccounts()).rejects.toThrow('pin_sheet_unavailable');
    expect(log).toHaveBeenCalledWith('pocket_hr_google_failure',{stage:'pin_sheet_unavailable',status:403,reasons:['PERMISSION_DENIED','SERVICE_DISABLED']});
    expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
  });
});
