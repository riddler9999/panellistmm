import { afterEach, describe, expect, it, vi } from 'vitest';
import { readProofs } from './pocketHrData';
import { releasedAnswer } from './deliveryPolicy';
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('current approval storage contract',()=>{
 it('loads email-based approvals and matches delivery revision before release',async()=>{
  vi.stubEnv('SUPABASE_URL','https://test.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','test-key');
  vi.stubGlobal('fetch',vi.fn()
   .mockResolvedValueOnce(new Response(JSON.stringify([{request_id:'r1',revision:2,approved_content:'verified',approved_by_account_id:null,approved_by_email:'admin@example.com',approved_at:'2026-10-15T00:00:00Z'}])))
   .mockResolvedValueOnce(new Response(JSON.stringify([{request_id:'r1',revision:1,result:'success',delivered_at:'2026-10-15T00:00:01Z'},{request_id:'r1',revision:2,result:'success',delivered_at:'2026-10-15T00:00:02Z'}]))));
  const proof=(await readProofs(['r1'])).get('r1')!;
  expect(proof.approval?.approvedByEmail).toBe('admin@example.com');
  expect(proof.delivery?.revision).toBe(2);
  expect(releasedAnswer({email:'user@example.com',role:'User'},{'Row ID':'r1',Owner_Email:'user@example.com'},proof.approval,proof.delivery)).toBe('verified');
 });
});
