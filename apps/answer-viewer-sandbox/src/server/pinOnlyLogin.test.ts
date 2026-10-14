import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, authenticatedPrincipal, sessionCookie } from './passcodeAuth';
import { generateKeyPairSync } from 'node:crypto';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function setup(rows: string[][]) {
 const privateKey = generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString();
 vi.stubEnv('SUPABASE_URL','https://example.supabase.co');
 vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test');
 vi.stubEnv('POCKET_HR_SHEET_ID','test');
 vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL','service@example.com');
 vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',privateKey);
 let storedEmail = '';
 const calls: string[] = [];
 vi.stubGlobal('fetch',vi.fn(async (url:string, options?:{body?:string}) => {
  calls.push(url);
  if(url.includes('/rpc/pocket_hr_allow_login_attempt')) return {ok:true,json:async()=>true};
  if(url.includes('oauth2.googleapis.com')) return {ok:true,json:async()=>({access_token:'test'})};
  if(url.includes('sheets.googleapis.com')) return {ok:true,json:async()=>({values:[['Email','Role','Passcode','Status'],...rows]})};
  if(url.includes('/pocket_hr_sessions') && options?.body && !url.includes('token_digest=eq.')) {
   storedEmail = JSON.parse(options.body).sheet_email;
   return {ok:true,json:async()=>[{}]};
  }
  if(url.includes('/pocket_hr_sessions?select=')) return {ok:true,json:async()=>[{sheet_email:storedEmail,expires_at:new Date(Date.now()+60000).toISOString(),revoked_at:null}]};
  throw Error('unexpected test endpoint');
 }));
 return calls;
}

describe('Google Sheets auth authority',()=>{
 it('authenticates unique active Sheet PIN',async()=>{
  const calls=setup([['a@example.com','Admin','1234','Active']]);
  const token=await authenticate('1234');
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(calls.some(x=>x.includes('pocket_hr_accounts'))).toBe(false);
 });
 it('rejects unknown PIN and collisions',async()=>{
  const calls=setup([['a@example.com','Admin','1234','Active'],['b@example.com','User','1234','Active']]);
  expect(await authenticate('1234')).toBeNull();
  expect(await authenticate('9999')).toBeNull();
  expect(calls.some(x=>x.includes('/pocket_hr_sessions'))).toBe(false);
 });
 it('resolves current Sheet role on session lookup',async()=>{
  const rows=[['a@example.com','User','1234','Active']];
  setup(rows);
  const token=await authenticate('1234');
  expect(token).not.toBeNull();
  expect(await authenticatedPrincipal({cookie:sessionCookie(token!)})).toEqual({email:'a@example.com',role:'User'});
  rows[0][1]='Admin';
  expect(await authenticatedPrincipal({cookie:sessionCookie(token!)})).toEqual({email:'a@example.com',role:'Admin'});
  rows[0][3]='Inactive';
  expect(await authenticatedPrincipal({cookie:sessionCookie(token!)})).toBeNull();
 });
});