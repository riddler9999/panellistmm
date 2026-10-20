import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-create';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db } from '../server/pocketHrData';
import { hasPendingAgentDraft, readConversation, saveConversation } from '../server/conversationLifecycle';
import { dispatchUnifiedRequest } from '../server/unifiedDispatch';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/pocketHrData', () => ({ db: vi.fn() }));
vi.mock('../server/conversationLifecycle', () => ({
 hasPendingAgentDraft: vi.fn(), readConversation: vi.fn(), saveConversation: vi.fn(),
}));
vi.mock('../server/unifiedDispatch', () => ({ dispatchUnifiedRequest: vi.fn() }));

function responseMock() {
 let code = 200; let body: unknown;
 const res = {
  status(n: number) { code = n; return res; },
  setHeader() {},
  json(value: unknown) { body = value; },
 };
 return { res, result: () => ({ code, body }) };
}
const key = '123e4567-e89b-42d3-a456-426614174000';
const principal = {
 accountId: '00000000-0000-4000-8000-000000000001',
 email: 'verified@example.com', role: 'User' as const,
};
const body = {
 title: 'Leave', category: 'Policy', description: 'How many leave days?',
 account_id: 'forged-account', ownerEmail: 'attacker@example.com',
 user_id: 'attacker@example.com', role: 'Admin',
};
const headers = {
 origin: 'https://app.test', host: 'app.test', 'idempotency-key': key,
};
const pendingState = {
 request_id: key, original_request: body.description, entries: [],
 closed_at: null, close_reason: null, reply_revision: 0, pending_sync: true,
};

async function call(input = body, requestHeaders: Record<string,string> = headers) {
 const { res, result } = responseMock();
 await handler({ method: 'POST', headers: requestHeaders, body: input }, res);
 return result();
}

beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(authenticatedPrincipal).mockResolvedValue(principal);
 vi.mocked(db).mockResolvedValue(true as never);
 vi.mocked(readConversation).mockResolvedValue(null);
 vi.mocked(hasPendingAgentDraft).mockResolvedValueOnce(false).mockResolvedValueOnce(true);
 vi.mocked(saveConversation).mockResolvedValue(undefined);
 vi.mocked(dispatchUnifiedRequest).mockResolvedValue('accepted');
});
afterEach(() => vi.unstubAllGlobals());

describe('Supabase request identity and retry handoff', () => {
 it('requires an idempotency key before any request writes', async () => {
  expect((await call(body, { origin: 'https://app.test', host: 'app.test' })).code).toBe(400);
  expect(db).not.toHaveBeenCalled();
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
 });

 it('rejects forged identity when there is no valid session', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue(null);
  expect((await call()).code).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });

 it('stores only the verified owner, dispatches it, and avoids Sheets', async () => {
  const outcome = await call();
  expect(outcome).toEqual({ code: 201, body: { ok: true, requestId: key, dispatchPending: false } });
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_create_request', 'POST', {
   p_request_id: key, p_owner_account_id: principal.accountId,
   p_content: body.description,
  });
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith({
   requestId: key, revision: 1, ownerEmail: principal.email,
   title: body.title, category: body.category, description: body.description,
  });
  expect(saveConversation).toHaveBeenCalledWith({ ...pendingState, pending_sync: false });
  expect(vi.mocked(db).mock.calls.every(([path]) => !String(path).includes('sheet'))).toBe(true);
 });

 it('does not duplicate the initial message or redispatch a completed retry', async () => {
  vi.mocked(db).mockResolvedValue(false as never);
  vi.mocked(readConversation).mockResolvedValue({ ...pendingState, pending_sync: false });
  expect(await call()).toEqual({ code: 200, body: { ok: true, requestId: key, dispatchPending: false } });
  expect(db).toHaveBeenCalledTimes(1);
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('retries the previously committed request without inserting another request', async () => {
  vi.mocked(db).mockResolvedValue(false as never);
  vi.mocked(readConversation).mockResolvedValue(pendingState);
  vi.mocked(hasPendingAgentDraft).mockReset().mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  expect((await call()).code).toBe(200);
  expect(db).toHaveBeenCalledTimes(1);
  expect(dispatchUnifiedRequest).toHaveBeenCalledTimes(1);
  expect(saveConversation).toHaveBeenCalledWith({ ...pendingState, pending_sync: false });
 });

 it('retains pending_sync when dispatch fails after transactional creation', async () => {
  vi.mocked(dispatchUnifiedRequest).mockRejectedValueOnce(new Error('dispatcher_unavailable'));
  expect(await call()).toEqual({ code: 201, body: { ok: true, requestId: key, dispatchPending: true } });
  expect(db).toHaveBeenCalledTimes(1);
  expect(saveConversation).not.toHaveBeenCalled();
 });

 it('keeps dispatch pending when 202 is returned before the draft is in Supabase', async () => {
  vi.mocked(hasPendingAgentDraft).mockReset().mockResolvedValue(false);
  expect(await call()).toEqual({ code: 201, body: { ok: true, requestId: key, dispatchPending: true } });
  expect(dispatchUnifiedRequest).toHaveBeenCalledOnce();
  expect(saveConversation).not.toHaveBeenCalled();
 });
});
