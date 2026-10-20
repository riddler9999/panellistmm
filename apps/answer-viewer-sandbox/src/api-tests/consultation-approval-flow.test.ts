import { draftVersion } from '../server/draftVersion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-approve';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { readConversation, withTicketLock } from '../server/conversationLifecycle';
import { db, readProof } from '../server/pocketHrData';

vi.mock('../server/conversationLifecycle', () => ({
 readConversation: vi.fn(), withTicketLock: vi.fn(),
}));
vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/pocketHrData', () => ({ readProof: vi.fn(), db: vi.fn() }));
vi.mock('../server/responseAttachments', () => ({
 selectAttachments: vi.fn(async () => []),
}));

const requestId = '00000000-0000-4000-8000-000000000019';
const original = 'Original HR request';
const agentDraft = 'Agent draft';
const approvedContent = 'Approved advice';
const version = draftVersion({ Request_Text: original }, agentDraft);
const request = {
 method: 'POST', headers: { origin: 'https://app.test', host: 'app.test' },
 body: { draftVersion: version, action: 'approve', requestId, expectedRevision: 0, content: approvedContent },
};
const approval = {
 requestId, revision: 1, approvedContent, approvedByEmail: 'admin@example.com',
 approvedAt: '2026-10-20T00:00:00Z',
};
const pendingDelivery = { requestId, revision: 1, result: 'pending' as const, deliveredAt: null };
const successDelivery = {
 requestId, revision: 1, result: 'success' as const, deliveredAt: '2026-10-20T00:00:01Z',
};
const empty = { approval: null, delivery: null };

async function call(body: Record<string, unknown> = request.body) {
 let status = 200; let responseBody: unknown;
 const res = {
  status(n: number) { status = n; return res; },
  setHeader() {},
  json(value: unknown) { responseBody = value; },
 };
 await handler({ ...request, body }, res);
 return { status, body: responseBody };
}

describe('Supabase approval publication and retry boundary', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: '00000000-0000-4000-8000-000000000001',
   email: 'admin@example.com', role: 'Admin',
  });
  vi.mocked(readConversation).mockResolvedValue(null);
  vi.mocked(withTicketLock).mockImplementation(async (_id, work) => work());
  vi.mocked(readProof).mockReset();
  vi.mocked(readProof).mockResolvedValue(empty);
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [{
    request_id: requestId, owner_account_id: '00000000-0000-4000-8000-000000000002',
   }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', revision: 1, content: agentDraft }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: original }] as never;
   if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
   if (path === 'rpc/pocket_hr_record_delivery_result') return 'success' as never;
   throw new Error('unexpected_database_query');
  });
 });

 it('publishes only an immutable committed snapshot with matching successful delivery', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(empty)
   .mockResolvedValueOnce({ approval, delivery: pendingDelivery })
   .mockResolvedValue({ approval, delivery: successDelivery });
  expect(await call()).toEqual({ status: 200, body: { ok: true, revision: 1, state: 'published' } });
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_approve_message', 'POST',
   expect.objectContaining({ p_expected_revision: 0, p_approved_content: approvedContent }));
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_record_delivery_result', 'POST',
   { p_request_id: requestId, p_revision: 1, p_success: true, p_error: null });
  expect(readProof).toHaveBeenCalledTimes(3);
 });

 it('leaves approval pending when delivery acknowledgement fails', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(empty)
   .mockResolvedValue({ approval, delivery: pendingDelivery });
  // Force failure at the acknowledgement RPC while leaving read-only lookups intact.
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [{ request_id: requestId }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', revision: 1, content: agentDraft }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: original }] as never;
   if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
   if (path === 'rpc/pocket_hr_record_delivery_result') throw new Error('acknowledge_failed');
   throw new Error('unexpected_database_query');
  });
  expect(await call()).toEqual({
   status: 503, body: { error: 'delivery_ack_pending', revision: 1 },
  });
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_record_delivery_result', 'POST', expect.any(Object));
 });

 it('denies a forged User role before writing an approval', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: '00000000-0000-4000-8000-000000000001',
   email: 'user@example.com', role: 'User',
  });
  expect((await call()).status).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });

 it('keeps a closed request read-only for Admin', async () => {
  vi.mocked(readConversation).mockResolvedValue({
   request_id: requestId, original_request: original, entries: [],
   reply_revision: 0, pending_sync: false, closed_at: '2026-10-19T00:00:00Z', close_reason: 'user',
  });
  expect((await call()).status).toBe(409);
  expect(db).not.toHaveBeenCalled();
 });

 it('rejects an altered draft before creating a new approval snapshot', async () => {
  expect((await call({ ...request.body, draftVersion: draftVersion({ Request_Text: original }, 'older draft') })).status).toBe(409);
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).startsWith('rpc/pocket_hr_approve_'))).toBe(false);
 });

 it('refuses to overwrite an already-approved answer with different content', async () => {
  vi.mocked(readProof).mockResolvedValue({ approval, delivery: successDelivery });
  const outcome = await call({ ...request.body, content: 'Changed answer' });
  expect(outcome).toEqual({ status: 409, body: { error: 'response_already_approved' } });
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).startsWith('rpc/pocket_hr_approve_'))).toBe(false);
 });

 it('resumes a committed approval after a publication failure without reapproving', async () => {
  vi.mocked(readProof).mockResolvedValueOnce({ approval, delivery: pendingDelivery })
   .mockResolvedValueOnce({ approval, delivery: pendingDelivery })
   .mockResolvedValue({ approval, delivery: successDelivery });
  expect((await call()).status).toBe(200);
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).startsWith('rpc/pocket_hr_approve_'))).toBe(false);
  expect(vi.mocked(db).mock.calls.filter(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toHaveLength(1);
 });

 it('does not add another delivery record on an identical published retry', async () => {
  vi.mocked(readProof).mockResolvedValue({ approval, delivery: successDelivery });
  expect((await call()).status).toBe(200);
  expect(vi.mocked(db).mock.calls.some(([path]) =>
   String(path).startsWith('rpc/pocket_hr_approve_') || path === 'rpc/pocket_hr_record_delivery_result')).toBe(false);
 });
});
