import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import handler from '../../api/consultation-maintenance';
import { db, readProof } from '../server/pocketHrData';
import {
 readConversation, saveConversation, withTicketLock,
 type ConversationState,
} from '../server/conversationLifecycle';

vi.mock('../server/pocketHrData', () => ({ db: vi.fn(), readProof: vi.fn() }));
vi.mock('../server/conversationLifecycle', async importOriginal => ({
 ...await importOriginal<typeof import('../server/conversationLifecycle')>(),
 readConversation: vi.fn(), saveConversation: vi.fn(), syncReply: vi.fn(),
 withTicketLock: vi.fn(),
}));

const id = '00000000-0000-4000-8000-000000000014';
const state: ConversationState = {
 request_id: id, original_request: 'Original request', entries: [],
 reply_revision: 0, pending_sync: false, closed_at: null, close_reason: null,
};
const proof = {
 approval: {
  requestId: id, revision: 1, approvedContent: 'Answer',
  approvedByEmail: 'admin@example.com', approvedAt: '2026-10-13T00:00:00Z',
 },
 delivery: {
  requestId: id, revision: 1, result: 'success' as const,
  deliveredAt: '2026-10-13T00:00:00Z',
 },
};

async function call(authorization = 'Bearer test-secret') {
 let status = 200;
 const res = { status(n: number) { status = n; return res; }, setHeader() {}, json: vi.fn() };
 await handler({ method: 'GET', headers: { authorization } }, res);
 return status;
}

beforeEach(() => {
 vi.clearAllMocks();
 vi.stubEnv('CRON_SECRET', 'test-secret');
 vi.useFakeTimers();
 vi.setSystemTime(new Date('2026-10-16T00:00:00Z'));
 vi.mocked(db).mockImplementation(async path => path.startsWith('pocket_hr_conversations?')
  ? [] as never : path.startsWith('pocket_hr_deliveries?')
  ? [{ request_id: id }] as never : (() => { throw new Error('unexpected_query'); })());
 vi.mocked(readConversation).mockResolvedValue(state);
 vi.mocked(readProof).mockResolvedValue(proof);
 vi.mocked(withTicketLock).mockImplementation(async (_id, work) => work());
 vi.mocked(saveConversation).mockResolvedValue(undefined);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe('Supabase scheduled consultation closure', () => {
 it('rejects an unauthenticated cron call', async () => {
  expect(await call('Bearer bad')).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });
 it('closes only an inactive approved request after delivery timeout', async () => {
  expect(await call()).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({
   request_id: id, close_reason: 'timeout',
  }));
 });
 it('does not close a request that received a reply before the ticket lock', async () => {
  vi.mocked(readConversation).mockResolvedValue({ ...state, reply_revision: 1 });
  expect(await call()).toBe(200);
  expect(saveConversation).not.toHaveBeenCalled();
 });
 it('does not close a newly delivered round based on an older deadline', async () => {
  vi.mocked(readProof).mockResolvedValue({
   ...proof,
   approval: { ...proof.approval, revision: 2 },
   delivery: { ...proof.delivery, revision: 2, deliveredAt: '2026-10-16T00:00:00Z' },
  });
  expect(await call()).toBe(200);
  expect(saveConversation).not.toHaveBeenCalled();
 });
});
