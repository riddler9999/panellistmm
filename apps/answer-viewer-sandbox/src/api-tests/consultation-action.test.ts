import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-action';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { validateConsultantAction } from '../server/consultantActions';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/consultantActions', () => ({ validateConsultantAction: vi.fn() }));

async function call(action: string) {
 let status = 200;
 let body: unknown;
 const res = { status(n: number) { status=n; return res; }, setHeader() {}, json(value: unknown) { body=value; } };
 await handler({ method:'POST', headers:{origin:'https://app.test',host:'app.test'}, body:{action} },res);
 return { status, body };
}

describe('consultant action endpoint', () => {
 beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId:'00000000-0000-4000-8000-000000000001',email:'consultant@example.com',role:'Consultant',
  });
  vi.mocked(validateConsultantAction).mockImplementation((body: unknown) => {
   const action=(body as {action?:string})?.action;
   return action === 'edit' || action === 'request_clarification'
    ? {action,requestId:'R-1',expectedRevision:0,content:'Edited draft'} : null;
  });
 });

 it.each(['edit','request_clarification'] as const)('%s requires a Supabase transaction', async action => {
  expect(await call(action)).toEqual({status:409,body:{error:'review_action_requires_approval'}});
 });

 it('reject is not a supported action', async () => {
  expect(await call('reject')).toEqual({status:400,body:{error:'invalid_action'}});
 });

 it('denies non-consultant sessions before validating an action', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId:'00000000-0000-4000-8000-000000000002',email:'user@example.com',role:'User',
  });
  expect((await call('edit')).status).toBe(403);
  expect(validateConsultantAction).not.toHaveBeenCalled();
 });
});
