import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/pocket-hr-admin-accounts';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { writePasscodeAccount } from '../server/pocketHrData';
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/pocketHrData',()=>({writePasscodeAccount:vi.fn(),writeAccountName:vi.fn()}));
async function request(body:unknown){
 let status=200;
 const res={status(n:number){status=n;return res;},setHeader(){},json(){}};
 await handler({method:'POST',headers:{origin:'https://panellistmm.vercel.app',host:'panellistmm.vercel.app'},body},res);
 return status;
}
describe('account administration input contract',()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(authenticatedPrincipal).mockResolvedValue({accountId:'00000000-0000-4000-8000-000000000001',role:'Admin',email:'admin@example.com'});});
 it('accepts a normal email and four digit PIN including leading zero',async()=>{
  expect(await request({action:'create',email:'user@example.com',role:'User',passcode:'0123'})).toBe(201);
  expect(writePasscodeAccount).toHaveBeenCalledWith('create','user@example.com','0123','User');
 });
 it('allows creating a Consultant account for review and approval work',async()=>{
  expect(await request({action:'create',email:'consultant@example.com',role:'Consultant',passcode:'4321'})).toBe(201);
  expect(writePasscodeAccount).toHaveBeenCalledWith('create','consultant@example.com','4321','Consultant');
 });
 it.each(['123','12a4','12345'])('rejects invalid PIN %s',async(passcode)=>{
  expect(await request({action:'create',email:'user@example.com',role:'User',passcode})).toBe(400);
  expect(writePasscodeAccount).not.toHaveBeenCalled();
 });
 it('rejects user role even with a valid payload',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({accountId:'00000000-0000-4000-8000-000000000001',role:'User',email:'user@example.com'});
  expect(await request({action:'create',email:'other@example.com',role:'Admin',passcode:'0123'})).toBe(403);
  expect(writePasscodeAccount).not.toHaveBeenCalled();
 });
});
