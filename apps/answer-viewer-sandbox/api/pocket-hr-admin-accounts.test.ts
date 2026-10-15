import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './pocket-hr-admin-accounts';
import { authenticatedPrincipal } from '../src/server/passcodeAuth';
import { writePasscodeAccount } from '../src/server/pocketHrData';
vi.mock('../src/server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../src/server/pocketHrData',()=>({writePasscodeAccount:vi.fn()}));
async function request(body:unknown){
 let status=200;
 const res={status(n:number){status=n;return res;},setHeader(){},json(){}};
 await handler({method:'POST',headers:{origin:'https://panellistmm.vercel.app',host:'panellistmm.vercel.app'},body},res);
 return status;
}
describe('account administration input contract',()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'Admin',email:'admin@example.com'});});
 it('accepts a normal email and four digit PIN including leading zero',async()=>{
  expect(await request({action:'create',email:'user@example.com',role:'User',passcode:'0123'})).toBe(201);
  expect(writePasscodeAccount).toHaveBeenCalledWith('create','user@example.com','0123','User');
 });
 it.each(['123','12a4','12345'])('rejects invalid PIN %s',async(passcode)=>{
  expect(await request({action:'create',email:'user@example.com',role:'User',passcode})).toBe(400);
  expect(writePasscodeAccount).not.toHaveBeenCalled();
 });
 it('rejects user role even with a valid payload',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'user@example.com'});
  expect(await request({action:'create',email:'other@example.com',role:'Admin',passcode:'0123'})).toBe(403);
  expect(writePasscodeAccount).not.toHaveBeenCalled();
 });
});
