import { afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/pocket-hr-session';
import { authenticatedPrincipal } from '../server/passcodeAuth';

vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn(),clearSessionCookie:vi.fn(),revokeSession:vi.fn()}));

function responseMock(){
 let code=200;let body:unknown;const res={status(value:number){code=value;return res;},setHeader(){},json(value:unknown){body=value;}};
 return {res,result:()=>({code,body})};
}

afterEach(()=>vi.resetAllMocks());

describe('Pocket HR session projection',()=>{
 it('does not expose the internal Supabase account ID to the client',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId:'00000000-0000-4000-8000-000000000001',email:'user@example.com',role:'User',
  });
  const {res,result}=responseMock();
  await handler({method:'GET',headers:{}},res);
  expect(result()).toEqual({code:200,body:{email:'user@example.com',role:'User'}});
 });
 it('rejects a missing verified session',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue(null);
  const {res,result}=responseMock();
  await handler({method:'GET',headers:{}},res);
  expect(result()).toEqual({code:401,body:{error:'unauthenticated'}});
 });
});
