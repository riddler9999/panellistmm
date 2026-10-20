import { encodeResponse } from '../domain/reviewedResponse';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import handler from '../../api/consultation-reply';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readProof } from '../server/pocketHrData';
import {
 readConversation, saveConversation, syncReply, withTicketLock,
 type ConversationState,
} from '../server/conversationLifecycle';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/pocketHrData', () => ({ db: vi.fn(), readProof: vi.fn() }));
vi.mock('../server/conversationLifecycle', async (importOriginal) => ({
 ...await importOriginal<typeof import('../server/conversationLifecycle')>(),
 readConversation: vi.fn(), saveConversation: vi.fn(),
 syncReply: vi.fn(), withTicketLock: vi.fn(),
}));

const ownerAccountId = '00000000-0000-4000-8000-000000000001';
const otherAccountId = '00000000-0000-4000-8000-000000000002';
const requestId = '00000000-0000-4000-8000-000000000010';
const headers = { origin: 'https://example.com', host: 'example.com' };
const body = { action: 'reply', requestId, expectedRevision: 1, content: 'Follow-up' };
const initial: ConversationState = {
 request_id: requestId, original_request: 'Initial request', entries: [],
 closed_at: null, close_reason: null, reply_revision: 0, pending_sync: false,
};
const proof = () => ({
 approval: {
  requestId, revision: 1, approvedContent: 'Approved reply',
  approvedByEmail: 'consultant@example.com', approvedAt: new Date().toISOString(),
 },
 delivery: { requestId, revision: 1, result: 'success' as const, deliveredAt: new Date().toISOString() },
});

async function call(input: unknown = body) {
 let status = 200;
 let responseBody: unknown;
 const res = {
  status(n: number) { status = n; return res; },
  setHeader() {},
  json(value: unknown) { responseBody = value; },
 };
 await handler({ method: 'POST', headers, body: input }, res);
 return { status, body: responseBody };
}

describe('Supabase-owned user replies and close', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: ownerAccountId, role: 'User', email: 'user@example.com',
  });
  vi.mocked(db).mockImplementation(async (path) => path.startsWith('pocket_hr_requests?')
   ? [{ request_id: requestId, owner_account_id: ownerAccountId }] as never
   : (() => { throw new Error('unexpected_db_query'); })());
  vi.mocked(readConversation).mockResolvedValue(initial);
  vi.mocked(saveConversation).mockResolvedValue(undefined);
  vi.mocked(syncReply).mockResolvedValue(undefined);
  vi.mocked(withTicketLock).mockImplementation(async (_id, work) => work());
  vi.mocked(readProof).mockResolvedValue(proof());
 });

 it('preserves the approved answer and dispatches with the verified session owner', async () => {
  expect((await call({ ...body, ownerEmail: 'forged@example.com' })).status).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({
   original_request: 'Initial request', reply_revision: 1, pending_sync: true,
   entries: [
    { role: 'consultant', content: 'Approved reply', revision: 1 },
    { role: 'user', content: 'Follow-up', revision: 1 },
   ],
  }));
  expect(syncReply).toHaveBeenCalledWith(expect.objectContaining({
   request_id: requestId, pending_sync: true,
  }), 'user@example.com');
  expect(vi.mocked(saveConversation).mock.invocationCallOrder[0])
   .toBeLessThan(vi.mocked(syncReply).mock.invocationCallOrder[0]);
 });

 it('denies another account owner including Admin without writing', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: otherAccountId, role: 'Admin', email: 'other@example.com',
  });
  expect((await call({ action: 'close', requestId })).status).toBe(404);
  expect(saveConversation).not.toHaveBeenCalled();
  expect(readProof).not.toHaveBeenCalled();
 });

 it('allows Admin to close their own request, but not other owners', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({
   accountId: ownerAccountId, role: 'Admin', email: 'user@example.com',
  });
  expect((await call({ action: 'close', requestId })).status).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({ close_reason: 'user' }));
 });

 it('allows verified owner to close without an approved response', async () => {
  vi.mocked(readProof).mockResolvedValue({ approval: null, delivery: null });
  expect((await call({ action: 'close', requestId })).status).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({
   closed_at: expect.any(String), close_reason: 'user',
  }));
 });

 it('rejects a stale revision and expired 48-hour reply window', async () => {
  expect((await call({ ...body, expectedRevision: 2 })).status).toBe(409);
  const old = proof();
  old.delivery.deliveredAt = '2000-01-01T00:00:00Z';
  vi.mocked(readProof).mockResolvedValue(old);
  expect((await call()).status).toBe(409);
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('retries a persisted pending turn without duplicating history', async () => {
  vi.mocked(readConversation).mockResolvedValue({
   ...initial, reply_revision: 1, pending_sync: true,
   entries: [{ role: 'user', content: 'Follow-up', revision: 1 }],
  });
  expect((await call()).status).toBe(200);
  expect(syncReply).toHaveBeenCalledWith(expect.objectContaining({
   reply_revision: 1, pending_sync: true,
  }), 'user@example.com');
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('preserves pending_sync if downstream dispatch fails', async () => {
  vi.mocked(syncReply).mockRejectedValueOnce(new Error('dispatcher_unavailable'));
  expect((await call()).status).toBe(503);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({ pending_sync: true }));
 });

 it('preserves approved attachments and choices for the next round', async () => {
  const existing = proof();
  const attachments = [{
   id: '00000000-0000-4000-8000-000000000005', name: 'form.xlsx',
   mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 100,
  }];
  existing.approval.approvedContent = encodeResponse({
   text: 'Choose a type', options: ['A', 'B'], attachments,
  });
  vi.mocked(readProof).mockResolvedValue(existing);
  expect((await call()).status).toBe(200);
  const stored = vi.mocked(saveConversation).mock.calls[0][0];
  expect(stored.entries[0]).toMatchObject({
   content: 'Choose a type', options: ['A', 'B'], attachments,
  });
 });
});
