import { beforeEach, describe, expect, it, vi } from 'vitest';
import approve from '../../api/consultation-approve';
import { draftVersion } from '../server/draftVersion';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readProof } from '../server/pocketHrData';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/conversationLifecycle', () => ({
 readConversation: vi.fn(async () => null),
 withTicketLock: vi.fn(async (_id: string, work: () => Promise<unknown>) => work()),
}));
vi.mock('../server/pocketHrData', () => ({ db: vi.fn(), readProof: vi.fn() }));
vi.mock('../server/responseAttachments', () => ({ selectAttachments: vi.fn(async () => []) }));

const requestId = '00000000-0000-4000-8000-000000000098';
const original = 'Original HR request';
const draft = 'AI draft';
const approvedText = 'Consultant reviewed answer';
const approved = {
 requestId, revision: 1, approvedContent: approvedText,
 approvedByEmail: 'consultant@example.com', approvedAt: '2026-10-20T00:00:00Z',
};
const pending = { requestId, revision: 1, result: 'pending' as const, deliveredAt: null };
const success = { requestId, revision: 1, result: 'success' as const, deliveredAt: '2026-10-20T00:01:00Z' };
const emptyProof = { approval: null, delivery: null };

async function callApprove() {
 let status = 200;
 let body: unknown;
 const res = {
  status(n: number) { status = n; return res; },
  setHeader() {},
  json(value: unknown) { body = value; },
 };
 await approve({
  method: 'POST', headers: { origin: 'https://example.com', host: 'example.com' },
  body: {
   action: 'approve', requestId, expectedRevision: 0,
   draftVersion: draftVersion({ Request_Text: original }, draft),
   content: approvedText,
  },
 }, res);
 return { status, body };
}

describe('delivery publication proof boundary', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: '00000000-0000-4000-8000-000000000001',
   email: 'consultant@example.com', role: 'Consultant',
  });
  vi.mocked(readProof).mockReset();
  vi.mocked(readProof).mockResolvedValue(emptyProof);
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [
    { request_id: requestId, owner_account_id: '00000000-0000-4000-8000-000000000002' },
   ] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', revision: 1, content: draft }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: original }] as never;
   if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
   if (path === 'rpc/pocket_hr_record_delivery_result') return 'success' as never;
   throw new Error('unexpected_database_query');
  });
 });

 it('does not mark delivery success when the approved snapshot is missing', async () => {
  // The approval RPC returning a revision is not independent publication proof.
  const outcome = await callApprove();
  expect(outcome.status).toBe(503);
  expect(outcome.body).toEqual({ error: 'delivery_ack_pending', revision: 1 });
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toBe(false);
 });

 it('rejects publication of a mismatched approved revision or content', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(emptyProof).mockResolvedValue({
   approval: { ...approved, approvedContent: 'Different response' },
   delivery: pending,
  });
  expect((await callApprove()).status).toBe(503);
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toBe(false);
 });

 it('publishes only after the committed snapshot and pending delivery are read and success is confirmed', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(emptyProof)
   .mockResolvedValueOnce({ approval: approved, delivery: pending })
   .mockResolvedValue({ approval: approved, delivery: success });
  const outcome = await callApprove();
  expect(outcome).toEqual({ status: 200, body: { ok: true, revision: 1, state: 'published' } });
  expect(readProof).toHaveBeenCalledTimes(3);
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_record_delivery_result', 'POST', {
   p_request_id: requestId, p_revision: 1, p_success: true, p_error: null,
  });
 });

 it('stays pending when delivery ack does not persist as success', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(emptyProof)
   .mockResolvedValue({ approval: approved, delivery: pending });
  const outcome = await callApprove();
  expect(outcome.status).toBe(503);
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toBe(true);
 });

 it('retries pending delivery for an identical approved snapshot without reapproval', async () => {
  vi.mocked(readProof).mockResolvedValueOnce({ approval: approved, delivery: pending })
   .mockResolvedValueOnce({ approval: approved, delivery: pending })
   .mockResolvedValue({ approval: approved, delivery: success });
  const outcome = await callApprove();
  expect(outcome.status).toBe(200);
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_approve_message')).toBe(false);
  expect(vi.mocked(db).mock.calls.filter(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toHaveLength(1);
 });

 it('does not write another acknowledgement after an already successful delivery', async () => {
  vi.mocked(readProof).mockResolvedValue({ approval: approved, delivery: success });
  const outcome = await callApprove();
  expect(outcome.status).toBe(200);
  expect(vi.mocked(db).mock.calls.some(([path]) =>
   path === 'rpc/pocket_hr_approve_message' || path === 'rpc/pocket_hr_record_delivery_result'
  )).toBe(false);
 });

 it('returns pending on a failed delivery acknowledgement without releasing the answer', async () => {
  vi.mocked(readProof).mockResolvedValueOnce(emptyProof)
   .mockResolvedValue({ approval: approved, delivery: pending });
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [{ request_id: requestId }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', revision: 1, content: draft }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: original }] as never;
   if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
   if (path === 'rpc/pocket_hr_record_delivery_result') throw new Error('delivery_rpc_failed');
   throw new Error('unexpected_database_query');
  });
  expect(await callApprove()).toEqual({ status: 503, body: { error: 'delivery_ack_pending', revision: 1 } });
  expect(vi.mocked(db).mock.calls.filter(([path]) => path === 'rpc/pocket_hr_record_delivery_result')).toHaveLength(1);
 });

 it('serializes concurrent identical approvals and acknowledges a committed revision only once', async () => {
  const { withTicketLock } = await import('../server/conversationLifecycle');
  let tail: Promise<void> = Promise.resolve();
  vi.mocked(withTicketLock).mockImplementation(async (_id, work) => {
   const previous = tail;
   let release!: () => void;
   tail = new Promise<void>(resolve => { release = resolve; });
   await previous;
   try { return await work(); } finally { release(); }
  });
  let approvalCommitted = false;
  let deliverySucceeded = false;
  let approvalWrites = 0;
  let deliveryWrites = 0;
  vi.mocked(readProof).mockImplementation(async () => ({
   approval: approvalCommitted ? approved : null,
   delivery: !approvalCommitted ? null : deliverySucceeded ? success : pending,
  }));
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return [{ request_id: requestId }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return [{ message_id: '00000000-0000-4000-8000-000000000003', revision: 1, content: draft }] as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return [{ content: original }] as never;
   if (path === 'rpc/pocket_hr_approve_message') {
    approvalWrites++;
    approvalCommitted = true;
    return 1 as never;
   }
   if (path === 'rpc/pocket_hr_record_delivery_result') {
    deliveryWrites++;
    deliverySucceeded = true;
    return 'success' as never;
   }
   throw new Error('unexpected_database_query');
  });
  const [first, second] = await Promise.all([callApprove(), callApprove()]);
  expect(first).toEqual({ status: 200, body: { ok: true, revision: 1, state: 'published' } });
  expect(second).toEqual(first);
  expect(approvalWrites).toBe(1);
  expect(deliveryWrites).toBe(1);
 });

});
