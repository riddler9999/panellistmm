import { scryptSync } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { writePasscodeAccount } from './pocketHrData';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
const configure=()=>{vi.stubEnv('SUPABASE_URL','https://example.supabase.co');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','service-role-test');};

describe('Supabase account administration',()=>{
 it('stores only a salted PIN hash in Supabase for a new account',async()=>{
  configure();
  const fetchMock=vi.fn<typeof fetch>()
   .mockResolvedValueOnce(new Response('[]'))
   .mockResolvedValueOnce(new Response('[{"id":"new-account"}]'));
  vi.stubGlobal('fetch',fetchMock);
  await writePasscodeAccount('create','new@example.com','0123','Consultant');
  const [url,init]=fetchMock.mock.calls[1];
  expect(String(url)).toContain('/rest/v1/pocket_hr_accounts');
  const body=JSON.parse(String(init?.body)) as {email:string;role:string;pin_hash:string;identity_provider:string};
  expect(body).toMatchObject({email:'new@example.com',role:'Consultant',identity_provider:'verified_admin_provisioning'});
  expect(body.pin_hash).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{64}$/);
  expect(body.pin_hash).not.toBe('0123');
 });
 it('blocks a PIN already assigned to another active account',async()=>{
  configure();
  const salt='0123456789abcdef0123456789abcdef';
  const hash=scryptSync('0123',Buffer.from(salt,'hex'),32).toString('hex');
  const fetchMock=vi.fn<typeof fetch>().mockResolvedValueOnce(new Response(JSON.stringify([
   {id:'existing',email:'existing@example.com',role:'User',pin_hash:`scrypt:${salt}:${hash}`,disabled_at:null,locked_until:null,display_name:null}
  ])));
  vi.stubGlobal('fetch',fetchMock);
  await expect(writePasscodeAccount('create','new@example.com','0123','User')).rejects.toThrow('pin_collision');
  expect(fetchMock).toHaveBeenCalledOnce();
 });
});
