import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-approve';
import { draftVersion } from '../server/draftVersion';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readProof } from '../server/pocketHrData';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/conversationLifecycle', () => ({
 readConversation: vi.fn(async () => null),
 withTicketLock: vi.fn(async (_id: string, work: () => Promise<unknown>) => work()),
}));
vi.mock('../server/pocketHrData', () => ({ db: vi.fn(), readProof: vi.fn() }));
vi.mock('../server/responseAttachments', () => ({
 selectAttachments: vi.fn(async () => []),
}));

const requestId = '00000000-0000-4000-8000-000000000099';
const originalRequest = 'Original HR request';
const draftContent = 'AI clarification draft';

async function approve(version: string) {
 let status = 200;
 let body: unknown;
 const res = {
  status(n: number) { status = n; return res; },
  setHeader() {},
  json(value: unknown) { body = value; },
 };
 await handler({
  method: 'POST',
  headers: { origin: 'https://example.com', host: 'example.com' },
  body: {
   action: 'approve', requestId, expectedRevision: 0,
   draftVersion: version, content: 'Consultant-approved answer',
  },
 }, res);
 return { status, body };
}

describe('Supabase approval draftVersion boundary', () => {
 beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: '00000000-0000-4000-8000-000000000001',
   role: 'Consultant', email: 'consultant@example.com',
  });
  vi.mocked(readProof).mockResolvedValue({ approval: null, delivery: null });
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [
    { request_id: requestId, owner_account_id: '00000000-0000-4000-8000-000000000002' },
   ] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', content: draftContent, revision: 1 }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: originalRequest }] as never;
   if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
   if (path === 'rpc/pocket_hr_record_delivery_result') return 'success' as never;
   throw new Error('unexpected_database_query');
  });
 });

 it('accepts the exact draft hash emitted by the sparse Supabase dashboard', async () => {
  const version = draftVersion({ Request_Text: originalRequest }, draftContent);
  const result = await approve(version);
  expect(result.status).toBe(200);
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_approve_message', 'POST',
   expect.objectContaining({ p_expected_revision: 0, p_approved_content: 'Consultant-approved answer' }));
 });

 it('rejects a changed AI draft without calling the approval RPC', async () => {
  const version = draftVersion({ Request_Text: originalRequest }, 'Older AI draft');
  const result = await approve(version);
  expect(result.status).toBe(409);
  expect(result.body).toEqual({ error: 'draft_changed' });
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).startsWith('rpc/pocket_hr_approve_'))).toBe(false);
 });
});
