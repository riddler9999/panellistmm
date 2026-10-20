import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-action';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { validateConsultantAction } from '../server/consultantActions';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/consultantActions', () => ({ validateConsultantAction: vi.fn() }));

async function call(action: 'edit'|'request_clarification'|'reject') {
 let status = 200;
 let body: unknown;
 const res = { status(n: number) { status=n; return res; }, setHeader() {}, json(value: unknown) { body=value; } };
 await handler({ method:'POST', headers:{origin:'https://app.test',host:'app.test'}, body:{action} },res);
 return { status, body };
}

describe('legacy consultant action endpoint', () => {
 beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId:'00000000-0000-4000-8000-000000000001',email:'consultant@example.com',role:'Consultant',
  });
  vi.mocked(validateConsultantAction).mockImplementation((body: unknown) => {
   const action=(body as {action?:string})?.action;
   return action ? {action,requestId:'R-1',expectedRevision:0,content:'Edited draft'} as never : null;
  });
 });

 it.each([
  ['edit','review_action_requires_approval'],
  ['request_clarification','review_action_requires_approval'],
  ['reject','review_action_not_supported'],
 ] as const)('%s cannot write Sheet state outside the Supabase review contract', async (action,error) => {
  expect(await call(action)).toEqual({status:409,body:{error}});
 });

 it('denies non-consultant sessions before validating an action', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId:'00000000-0000-4000-8000-000000000002',email:'user@example.com',role:'User',
  });
  expect((await call('edit')).status).toBe(403);
  expect(validateConsultantAction).not.toHaveBeenCalled();
 });
});
