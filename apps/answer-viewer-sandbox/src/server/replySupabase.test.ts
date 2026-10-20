import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncReply, type ConversationState } from './conversationLifecycle';
import { db } from './pocketHrData';
import { dispatchUnifiedRequest } from './unifiedDispatch';

vi.mock('./pocketHrData', () => ({ db: vi.fn() }));
vi.mock('./unifiedDispatch', () => ({ dispatchUnifiedRequest: vi.fn() }));
vi.mock('./pocketHrRedis', () => ({ redisCommand: vi.fn() }));

const state: ConversationState = {
 request_id: '00000000-0000-4000-8000-000000000076',
 original_request: 'Original HR request',
 entries: [
  { role: 'consultant', content: 'Approved answer', revision: 1, options: ['Option A'] },
  { role: 'user', content: 'Follow-up question', revision: 1 },
 ],
 reply_revision: 1, pending_sync: true, closed_at: null, close_reason: null,
};
const ownerEmail = 'owner@example.com';
const lookup = 'pocket_hr_messages?select=content,request_id&message_id=eq.';

describe('Supabase owner reply outbox and n8n handoff', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith(lookup)) return [] as never;
   if (path.startsWith('pocket_hr_messages?select=message_id,content')) return [{message_id:'draft-1',content:'Draft'}] as never;
   if (path === 'pocket_hr_messages') return [] as never;
   if (path === 'rpc/pocket_hr_save_conversation') return undefined as never;
   throw new Error('unexpected_database_operation');
  });
  vi.mocked(dispatchUnifiedRequest).mockResolvedValue('accepted');
 });

 it('saves a user message with a null review state and dispatches the verified owner', async () => {
  await syncReply(state, ownerEmail);
  expect(db).toHaveBeenCalledWith('pocket_hr_messages', 'POST', expect.objectContaining({
   request_id: state.request_id,
   sender: 'user', content: 'Follow-up question',
   revision: 2, review_state: null,
   message_id: expect.stringMatching(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-8[0-9a-f]{3}-[0-9a-f]{12}$/),
  }));
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith(expect.objectContaining({
   requestId: state.request_id, revision: 2, ownerEmail,
   description: 'Original HR request\n\nConsultant: Approved answer\nOptions: Option A\n\nUser: Follow-up question',
  }));
  expect(db).toHaveBeenLastCalledWith('rpc/pocket_hr_save_conversation', 'POST', {
   p_state: { ...state, pending_sync: false },
  });
 });

 it('fails closed for missing owner identity before storing or dispatching', async () => {
  await expect(syncReply(state, '')).rejects.toThrow('verified_reply_owner_required');
  expect(db).not.toHaveBeenCalled();
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
 });

 it('retries a previously persisted user turn without inserting a duplicate', async () => {
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith(lookup)) return [{
    request_id: state.request_id, content: 'Follow-up question',
   }] as never;
   if (path.startsWith('pocket_hr_messages?select=message_id,content')) return [{message_id:'draft-1',content:'Draft'}] as never;
   if (path === 'rpc/pocket_hr_save_conversation') return undefined as never;
   throw new Error('duplicate_message_insert');
  });
  await syncReply(state, ownerEmail);
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'pocket_hr_messages')).toBe(false);
  expect(dispatchUnifiedRequest).toHaveBeenCalledTimes(1);
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation', 'POST', {
   p_state: { ...state, pending_sync: false },
  });
 });

 it('leaves a durable pending_sync turn when n8n dispatch fails', async () => {
  vi.mocked(dispatchUnifiedRequest).mockRejectedValueOnce(new Error('dispatcher_unavailable'));
  await expect(syncReply(state, ownerEmail)).rejects.toThrow('dispatcher_unavailable');
  expect(db).toHaveBeenCalledWith('pocket_hr_messages', 'POST', expect.any(Object));
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_save_conversation')).toBe(false);
 });

 it('does not clear pending_sync when n8n accepted work but no draft exists yet', async () => {
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith(lookup)) return [] as never;
   if (path === 'pocket_hr_messages') return [] as never;
   if (path.startsWith('pocket_hr_messages?select=message_id,content')) return [] as never;
   if (path === 'rpc/pocket_hr_save_conversation') return undefined as never;
   throw new Error('unexpected_database_operation');
  });
  await expect(syncReply(state, ownerEmail)).rejects.toThrow('agent_draft_not_persisted');
  expect(dispatchUnifiedRequest).toHaveBeenCalledOnce();
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'rpc/pocket_hr_save_conversation')).toBe(false);
 });

 it('refuses a stored idempotency key with different message content', async () => {
  vi.mocked(db).mockResolvedValueOnce([{ request_id: state.request_id, content: 'Different reply' }] as never);
  await expect(syncReply(state, ownerEmail)).rejects.toThrow('reply_message_conflict');
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
 });
});
