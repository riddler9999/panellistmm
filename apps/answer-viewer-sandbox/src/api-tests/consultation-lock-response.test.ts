import { beforeEach, describe, it, expect, vi } from 'vitest';
import approve from '../../api/consultation-approve';
import upload from '../../api/consultation-file';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readProof, readTickets } from '../server/pocketHrData';
import { readConversation, withTicketLock } from '../server/conversationLifecycle';
import { selectAttachments, validateAttachment, storeAttachment } from '../server/responseAttachments';
import { draftVersion } from '../server/draftVersion';
import { decodeResponse, encodeResponse } from '../domain/reviewedResponse';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/pocketHrData', () => ({
 db: vi.fn(), readProof: vi.fn(), readTickets: vi.fn(),
}));
vi.mock('../server/conversationLifecycle', () => ({
 readConversation: vi.fn(), withTicketLock: vi.fn(),
}));
vi.mock('../server/responseAttachments', () => ({
 selectAttachments: vi.fn(), validateAttachment: vi.fn(), storeAttachment: vi.fn(),
}));

const requestId = '00000000-0000-4000-8000-000000000018';
const file = {
 id: '00000000-0000-4000-8000-000000000001',
 name: 'answer.pdf', mime: 'application/pdf', size: 100,
};
const headers = { origin: 'https://example.com', host: 'example.com' };
const approvedContent = encodeResponse({ text: 'Edited answer', options: [], attachments: [file] });
const approval = {
 requestId, revision: 1, approvedContent, approvedByEmail: 'admin@example.com',
 approvedAt: '2026-10-20T00:00:00Z',
};
const pending = { requestId, revision: 1, result: 'pending' as const, deliveredAt: null };
const success = {
 requestId, revision: 1, result: 'success' as const,
 deliveredAt: '2026-10-20T00:01:00Z',
};

function response() {
 let status = 200;
 const res = {
  status(n: number) { status = n; return res; },
  setHeader() {},
  json: vi.fn(), send: vi.fn(),
 };
 return { res, status: () => status };
}

beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(authenticatedPrincipal).mockResolvedValue({
  accountId: '00000000-0000-4000-8000-000000000003',
  email: 'admin@example.com', role: 'Admin',
 });
 vi.mocked(readConversation).mockResolvedValue(null);
 vi.mocked(readTickets).mockResolvedValue([{
  'Row ID': requestId, Owner_Email: 'user@example.com', Ticket_Status: 'Awaiting Review',
 }]);
 vi.mocked(readProof).mockReset();
 vi.mocked(readProof).mockResolvedValueOnce({ approval: null, delivery: null })
  .mockResolvedValueOnce({ approval, delivery: pending })
  .mockResolvedValue({ approval, delivery: success });
 vi.mocked(db).mockImplementation(async (path) => {
  if (path.startsWith('pocket_hr_requests?')) return [{
   request_id: requestId, owner_account_id: '00000000-0000-4000-8000-000000000004',
  }] as never;
  if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
   return [{ message_id: '00000000-0000-4000-8000-000000000005', content: 'Draft', revision: 1 }] as never;
  if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
   return [{ content: 'Original HR request' }] as never;
  if (path === 'rpc/pocket_hr_approve_message') return 1 as never;
  if (path === 'rpc/pocket_hr_record_delivery_result') return 'success' as never;
  throw new Error('unexpected_db_query');
 });
 vi.mocked(selectAttachments).mockResolvedValue([file]);
 vi.mocked(storeAttachment).mockResolvedValue(file);
 vi.mocked(validateAttachment).mockResolvedValue({
  name: file.name, mime: file.mime, bytes: Buffer.from('file'),
 });
});

describe('upload and Supabase approval single-response lifecycle', () => {
 for (const operation of ['upload', 'approve'] as const) {
  for (const cleanupFails of [false, true]) {
   it(`${operation} responds only after lock cleanup (${cleanupFails ? 'failure' : 'success'})`, async () => {
    const { res, status } = response();
    vi.mocked(withTicketLock).mockImplementation(async (_id, work) => {
     const outcome = await work();
     expect(res.json).not.toHaveBeenCalled();
     if (cleanupFails) throw new Error('redis_request_failed');
     return outcome;
    });
    if (operation === 'upload') {
     await upload({
      method: 'POST', headers,
      body: { requestId, name: file.name, base64: 'ZmlsZQ==' },
     }, res);
    } else {
     await approve({
      method: 'POST', headers,
      body: {
       action: 'approve', requestId, expectedRevision: 0,
       draftVersion: draftVersion({ Request_Text: 'Original HR request' }, 'Draft'),
       content: 'Edited answer', options: [], attachmentIds: [file.id],
      },
     }, res);
    }
    expect(res.json).toHaveBeenCalledTimes(1);
    expect(status()).toBe(cleanupFails ? 503 : operation === 'upload' ? 201 : 200);
    if (operation === 'approve') {
     const approvalCall = vi.mocked(db).mock.calls.find(([path]) =>
      path === 'rpc/pocket_hr_approve_message');
     expect(approvalCall).toBeDefined();
     const input = approvalCall?.[2] as { p_approved_content: string };
     expect(decodeResponse(input.p_approved_content)).toEqual({
      text: 'Edited answer', options: [], attachments: [file],
     });
     expect(db).toHaveBeenCalledWith('rpc/pocket_hr_record_delivery_result', 'POST',
      { p_request_id: requestId, p_revision: 1, p_success: true, p_error: null });
    }
   });
  }
 }
});
