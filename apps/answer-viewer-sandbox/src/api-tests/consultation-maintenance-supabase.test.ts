import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-maintenance';
import { db, readProofs, readProof } from '../server/pocketHrData';
import {
 hasPendingAgentDraft, readConversation, saveConversation, syncReply, withTicketLock,
 type ConversationState,
} from '../server/conversationLifecycle';
import { dispatchUnifiedRequest } from '../server/unifiedDispatch';

vi.mock('../server/pocketHrData', () => ({
 db: vi.fn(), readProof: vi.fn(), readProofs: vi.fn(),
}));
vi.mock('../server/conversationLifecycle', async (importOriginal) => ({
 ...await importOriginal<typeof import('../server/conversationLifecycle')>(),
 hasPendingAgentDraft: vi.fn(), readConversation: vi.fn(), saveConversation: vi.fn(), syncReply: vi.fn(),
 withTicketLock: vi.fn(),
}));
vi.mock('../server/unifiedDispatch', () => ({ dispatchUnifiedRequest: vi.fn() }));

const requestId = '00000000-0000-4000-8000-000000000011';
const ownerAccountId = '00000000-0000-4000-8000-000000000012';
const replyState: ConversationState = {
 request_id: requestId, original_request: 'Original HR issue',
 entries: [{ role: 'consultant', content: 'Answer', revision: 1 },
  { role: 'user', content: 'Follow-up', revision: 1 }],
 closed_at: null, close_reason: null, reply_revision: 1, pending_sync: true,
};
const initialState: ConversationState = {
 ...replyState, entries: [], reply_revision: 0,
};
const approved = {
 requestId, revision: 1, approvedContent: 'Answer',
 approvedByEmail: 'consultant@example.com', approvedAt: '2026-10-15T00:00:00Z',
};
const delivered = {
 requestId, revision: 1, result: 'success' as const,
 deliveredAt: '2026-10-15T00:00:01Z',
};
async function runCron(auth = 'Bearer test-cron-secret') {
 let status = 200;
 let body: unknown;
 const res = { status(n: number) { status = n; return res; },
  setHeader() {}, json(value: unknown) { body = value; } };
 await handler({ method: 'GET', headers: { authorization: auth } }, res);
 return { status, body };
}

describe('Supabase-only maintenance for pending n8n dispatch and auto-close', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('CRON_SECRET', 'test-cron-secret');
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-20T00:00:00Z'));
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_conversations?')) return [replyState] as never;
   if (path.startsWith('pocket_hr_deliveries?')) return [] as never;
   if (path.startsWith('pocket_hr_requests?')) return [{ owner_account_id: ownerAccountId, request_id: requestId }] as never;
   if (path.startsWith('pocket_hr_accounts?')) return [{ email: 'owner@example.com', disabled_at: null }] as never;
   throw new Error('unexpected_database_operation');
  });
  vi.mocked(withTicketLock).mockImplementation(async (_id, work) => work());
  vi.mocked(readConversation).mockResolvedValue(replyState);
  vi.mocked(hasPendingAgentDraft).mockResolvedValue(false);
  vi.mocked(saveConversation).mockResolvedValue(undefined);
  vi.mocked(syncReply).mockResolvedValue(undefined);
  vi.mocked(dispatchUnifiedRequest).mockResolvedValue('accepted');
  vi.mocked(readProofs).mockResolvedValue(new Map());
  vi.mocked(readProof).mockResolvedValue({ approval: null, delivery: null });
 });
 afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

 it('rejects a missing or incorrect cron secret before database access', async () => {
  expect((await runCron('Bearer incorrect')).status).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });

 it('retries the pending user turn with DB-owned identity and no Sheet reads', async () => {
  expect(await runCron()).toEqual({ status: 200, body: { ok: true, failures: 0 } });
  expect(syncReply).toHaveBeenCalledWith(replyState, 'owner@example.com');
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).includes('Sheet'))).toBe(false);
 });

 it('retries an initial unsent request separately from a follow-up turn', async () => {
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_conversations?')) return [initialState] as never;
   if (path.startsWith('pocket_hr_deliveries?')) return [] as never;
   if (path.startsWith('pocket_hr_requests?')) return [{ owner_account_id: ownerAccountId }] as never;
   if (path.startsWith('pocket_hr_accounts?')) return [{ email: 'owner@example.com', disabled_at: null }] as never;
   if (path.startsWith('pocket_hr_messages?select=message_id,content')) return [] as never;
   throw new Error('unexpected_database_operation');
  });
  vi.mocked(readConversation).mockResolvedValue(initialState);
  vi.mocked(hasPendingAgentDraft).mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(false);
  expect((await runCron()).status).toBe(200);
  expect(syncReply).not.toHaveBeenCalled();
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith(expect.objectContaining({
   requestId, revision: 1, ownerEmail: 'owner@example.com', description: 'Original HR issue',
  }));
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('clears a pending initial outbox only after Supabase contains the expected draft', async () => {
  const initialPending={...initialState,pending_sync:true};
  vi.mocked(db).mockImplementation(async path => path.startsWith('pocket_hr_conversations?')
   ? [initialPending] as never : path.startsWith('pocket_hr_deliveries?')
   ? [] as never : path.startsWith('pocket_hr_requests?')
   ? [{owner_account_id:ownerAccountId}] as never : path.startsWith('pocket_hr_accounts?')
   ? [{email:'owner@example.com',disabled_at:null}] as never : [] as never);
  vi.mocked(readConversation).mockResolvedValue(initialPending);
  vi.mocked(hasPendingAgentDraft).mockReset().mockResolvedValue(true);
  expect((await runCron()).status).toBe(200);
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
  expect(saveConversation).toHaveBeenCalledWith({...initialPending,pending_sync:false});
 });

 it('refuses to dispatch if stored owner lookup is missing', async () => {
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_conversations?')) return [replyState] as never;
   if (path.startsWith('pocket_hr_deliveries?')) return [] as never;
   if (path.startsWith('pocket_hr_requests?')) return [] as never;
   throw new Error('unexpected_database_operation');
  });
  const outcome = await runCron();
  expect(outcome).toEqual({ status: 503, body: { ok: false, failures: 1 } });
  expect(syncReply).not.toHaveBeenCalled();
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
 });

 it('preserves pending_sync on a failed retry and reports one failure', async () => {
  vi.mocked(syncReply).mockRejectedValueOnce(new Error('dispatcher_unavailable'));
  expect(await runCron()).toEqual({ status: 503, body: { ok: false, failures: 1 } });
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('closes an expired published revision only after re-reading the proof under lock', async () => {
  const active = { ...replyState, entries: [], reply_revision: 0, pending_sync: false };
  vi.mocked(db).mockImplementation(async path => path.startsWith('pocket_hr_conversations?')
   ? [active] as never : path.startsWith('pocket_hr_deliveries?')
   ? [{ request_id: requestId }] as never : [] as never);
  vi.mocked(readConversation).mockResolvedValue(active);
  vi.mocked(readProofs).mockResolvedValue(new Map([[requestId, { approval: approved, delivery: delivered }]]));
  vi.mocked(readProof).mockResolvedValue({ approval: approved, delivery: delivered });
  expect((await runCron()).status).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({
   request_id: requestId, close_reason: 'timeout', closed_at: expect.any(String),
  }));
 });

 it('does not close when a newer delivery moves the deadline', async () => {
  const active = { ...replyState, entries: [], reply_revision: 0, pending_sync: false };
  vi.mocked(db).mockImplementation(async path => path.startsWith('pocket_hr_conversations?')
   ? [active] as never : path.startsWith('pocket_hr_deliveries?')
   ? [{ request_id: requestId }] as never : [] as never);
  vi.mocked(readConversation).mockResolvedValue(active);
  vi.mocked(readProofs).mockResolvedValue(new Map([[requestId, { approval: approved, delivery: delivered }]]));
  vi.mocked(readProof).mockResolvedValue({
   approval: { ...approved, revision: 2 },
   delivery: { ...delivered, revision: 2, deliveredAt: '2026-10-20T00:00:00Z' },
  });
  expect((await runCron()).status).toBe(200);
  expect(saveConversation).not.toHaveBeenCalled();
 });
});
