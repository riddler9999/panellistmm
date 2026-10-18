import { afterEach, describe, expect, it, vi } from 'vitest';
import { authenticate, authenticatedPrincipal, sessionCookie, revokeSession } from './passcodeAuth';
import { generateKeyPairSync } from 'node:crypto';

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function setup(rows: string[][]) {
 const privateKey = generateKeyPairSync('rsa',{modulusLength:2048}).privateKey.export({type:'pkcs8',format:'pem'}).toString();
 vi.stubEnv('UPSTASH_REDIS_REST_URL','https://example.upstash.io');
 vi.stubEnv('UPSTASH_REDIS_REST_TOKEN','test');
 vi.stubEnv('POCKET_HR_SHEET_ID','test');
 vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_EMAIL','service@test.iam.gserviceaccount.com');
 vi.stubEnv('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',privateKey);
 const redis = new Map<string,string>();
 const calls: string[] = [];
 vi.stubGlobal('fetch',vi.fn(async (url:string, options?:{body?:string}) => {
  calls.push(url);
  if(url.includes('example.upstash.io')) {
   const [command,...args] = JSON.parse(options?.body ?? '[]') as Array<string|number>;
   const key=String(args[0]);
   let result:unknown=null;
   if(command==='EVAL'){const counterKey=String(args[2]);const count=Number(redis.get(counterKey)??0)+1;redis.set(counterKey,String(count));result=count;}
   else if(command==='GET') result=redis.get(key)??null;
   else if(command==='SET'){redis.set(key,String(args[1]));result='OK';}
   else if(command==='DEL'){result=redis.delete(key)?1:0;}
   else if(command==='INCR'){const count=Number(redis.get(key)??0)+1;redis.set(key,String(count));result=count;}
   else throw Error('unexpected Redis command');
   return {ok:true,json:async()=>({result})};
  }
  if(url.includes('oauth2.googleapis.com')) return {ok:true,json:async()=>({access_token:'test'})};
  if(url.includes('sheets.googleapis.com')) return {ok:true,json:async()=>({values:[['Email','Role','Passcode','Status'],...rows]})};
  throw Error('unexpected test endpoint');
 }));
 return calls;
}

describe('Google Sheets auth authority',()=>{
 it('rejects a disabled account and invalid PIN before creating a session',async()=>{
  setup([['a@example.com','User','1234','Disabled']]);
  expect(await authenticate('1234')).toBeNull();
  expect(await authenticate('9999')).toBeNull();
 });
 it('invalidates a session on logout',async()=>{
  setup([['a@example.com','User','1234','Active']]);
  const token=await authenticate('1234');
  const headers={cookie:sessionCookie(token!)};
  expect(await authenticatedPrincipal(headers)).not.toBeNull();
  await revokeSession(headers);
  expect(await authenticatedPrincipal(headers)).toBeNull();
 });
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
  expect(calls.filter(x=>x.includes('example.upstash.io')).length).toBe(2);
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
