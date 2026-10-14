import { afterEach, describe, expect, it, vi } from 'vitest';
import { generateKeyPairSync } from 'node:crypto';
import { authenticate } from './passcodeAuth';
import login from '../../api/pocket-hr-login';

afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});

describe('PIN-only authentication',()=>{
 it('accepts a request with PIN only and rejects missing PIN before private I/O',async()=>{
  const fetchMock=vi.fn();vi.stubGlobal('fetch',fetchMock);
  let status=0;let payload:unknown;
  const res={status(n:number){status=n;return res;},setHeader(){},json(v:unknown){payload=v;}};
  await login({method:'POST',body:{}},res);
  expect(status).toBe(400);expect(payload).toEqual({error:'invalid_input'});
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('rejects duplicate PIN without looking up accounts or writing a session',async()=>{
  const key=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString();
  vi.stubEnv('SUPABASE_URL','https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key');
  vi.stubEnv('POCKET_HR_SHEET_ID','test-sheet');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL','test@example.com');
  vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',key);
  const requested:string[]=[];
  vi.stubGlobal('fetch',vi.fn(async (url:string)=>{
   requested.push(url);
   if(url.includes('/rest/v1/rpc/pocket_hr_allow_login_attempt'))return {ok:true,json:async()=>true};
   if(url.includes('oauth2.googleapis.com'))return {ok:true,json:async()=>({access_token:'fake'})};
   if(url.includes('sheets.googleapis.com'))return {ok:true,json:async()=>({values:[['Email','Role','Passcode','Status'],['a@example.com','Admin','1234','Active'],['b@example.com','User','1234','Active']]})};
   throw new Error('unexpected private account or session access');
  }));
  expect(await authenticate('1234')).toBeNull();
  expect(requested.some(x=>x.includes('pocket_hr_accounts'))).toBe(false);
  expect(requested.some(x=>x.includes('pocket_hr_sessions'))).toBe(false);
 });
});
