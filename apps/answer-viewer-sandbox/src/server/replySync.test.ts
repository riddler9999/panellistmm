import { beforeEach, describe, expect, it, vi } from 'vitest';
import { syncReply, type ConversationState } from './conversationLifecycle';
import { db } from './pocketHrData';
import { dispatchUnifiedRequest } from './unifiedDispatch';

vi.mock('./pocketHrData', () => ({ db: vi.fn() }));
vi.mock('./unifiedDispatch', () => ({ dispatchUnifiedRequest: vi.fn() }));
vi.mock('./pocketHrRedis', () => ({ redisCommand: vi.fn() }));

const state: ConversationState = {
 request_id: 'T', original_request: 'Original',
 entries: [
  { role: 'consultant', content: 'Answer', revision: 1 },
  { role: 'user', content: 'More', revision: 1 },
 ],
 reply_revision: 1, pending_sync: true, closed_at: null, close_reason: null,
};

describe('retryable Supabase reply outbox', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db).mockImplementation(async (path) =>
   path.startsWith('pocket_hr_requests?') ? [{title:'Leave request',category:'Leave'}] as never :
   path.startsWith('pocket_hr_messages?select=content,request_id') ? [] as never :
   path.startsWith('pocket_hr_messages?select=message_id,content') ? [{message_id:'draft-1',content:'Draft'}] as never : undefined as never
  );
  vi.mocked(dispatchUnifiedRequest).mockResolvedValue('accepted');
 });

 it('writes only to Supabase and dispatches full approved context with owner', async () => {
  await syncReply(state, 'owner@example.com');
  expect(db).toHaveBeenCalledWith('pocket_hr_messages', 'POST',
   expect.objectContaining({ sender: 'user', review_state: null, content: 'More' }));
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith({
   requestId: 'T', revision: 2, ownerEmail: 'owner@example.com', title:'Leave request',category:'Leave',
   description: 'Original\n\nConsultant: Answer\n\nUser: More',
  });
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation', 'POST', {
   p_state: { ...state, pending_sync: false },
  });
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).includes('Sheet'))).toBe(false);
 });

 it('resumes n8n dispatch without inserting a duplicate user turn', async () => {
  vi.mocked(db).mockImplementation(async path => path.startsWith('pocket_hr_requests?') ? [{title:'Leave request',category:'Leave'}] as never : path.startsWith('pocket_hr_messages?select=')
   ? path.startsWith('pocket_hr_messages?select=message_id,content')
    ? [{message_id:'draft-1',content:'Draft'}] as never
    : [{ request_id: 'T', content: 'More' }] as never : undefined as never);
  await syncReply(state, 'owner@example.com');
  expect(vi.mocked(db).mock.calls.some(([path]) => path === 'pocket_hr_messages')).toBe(false);
  expect(dispatchUnifiedRequest).toHaveBeenCalledTimes(1);
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation', 'POST', {
   p_state: { ...state, pending_sync: false },
  });
 });
});
