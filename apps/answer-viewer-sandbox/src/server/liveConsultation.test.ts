import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLiveConsultations } from './liveConsultation';
import { db, readProofs, readPasscodeAccounts } from './pocketHrData';
import { readConversations } from './conversationLifecycle';
import { draftVersion } from './draftVersion';

vi.mock('./conversationLifecycle', async importOriginal => ({
 ...await importOriginal<typeof import('./conversationLifecycle')>(),
 readConversations: vi.fn(),
}));
vi.mock('./pocketHrData', () => ({
 db: vi.fn(), readPasscodeAccounts: vi.fn(), readProofs: vi.fn(),
}));

const requestA = {
 request_id: 'A-001', owner_account_id: 'acct-a', created_at: '2026-10-19T00:00:00Z',
};
const requestB = {
 request_id: 'B-001', owner_account_id: 'acct-b', created_at: '2026-10-19T01:00:00Z',
};
const owners = [
 { id: 'acct-a', email: 'a@example.com' },
 { id: 'acct-b', email: 'b@example.com' },
];
const firstUserMessages = [
 { request_id: 'A-001', content: 'Leave request' },
 { request_id: 'B-001', content: 'Policy request' },
];
const agentDraft = JSON.stringify({
 kind: 'clarification', question: 'Consultant-only AI question',
 options: ['Option A', 'Option B'],
});
const pendingAgentMessages = [
 { request_id: 'A-001', content: agentDraft, revision: 1 },
];
const userA = { email: 'a@example.com', role: 'User' as const, accountId: 'acct-a' };
const userB = { email: 'b@example.com', role: 'User' as const, accountId: 'acct-b' };
const deliveredApproval = {
 requestId: 'B-001', revision: 3, approvedContent: 'verified snapshot',
 approvedByAccountId: 'consultant-account', approvedAt: '2026-10-15T00:00:00Z',
};
const successfulDelivery = {
 requestId: 'B-001', revision: 3, result: 'success' as const,
 deliveredAt: '2026-10-15T00:00:01Z',
};

let requests = [requestA, requestB];
let accounts = [...owners];
let agentMessages = [...pendingAgentMessages];

describe('Supabase live consultation projection and privacy', () => {
 beforeEach(() => {
  vi.clearAllMocks();
  requests = [requestA, requestB];
  accounts = [...owners];
  agentMessages = [...pendingAgentMessages];
  vi.mocked(readProofs).mockResolvedValue(new Map());
  vi.mocked(readPasscodeAccounts).mockResolvedValue([]);
  vi.mocked(readConversations).mockResolvedValue(new Map());
  vi.mocked(db).mockImplementation(async (path) => {
   if (path.startsWith('pocket_hr_requests?')) return requests as never;
   if (path.startsWith('pocket_hr_accounts?')) return accounts as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.user'))
    return firstUserMessages as never;
   if (path.startsWith('pocket_hr_messages?') && path.includes('sender=eq.agent'))
    return agentMessages as never;
   throw new Error('unexpected_database_query');
  });
 });

 it('rejects missing verified principal before touching Supabase', async () => {
  await expect(loadLiveConsultations(null as never)).rejects.toThrow('verified_principal_required');
  expect(db).not.toHaveBeenCalled();
 });

 it('enforces owner isolation and never queries AI drafts for a User', async () => {
  const rows = await loadLiveConsultations(userA);
  expect(rows.map(row => row.ticketId)).toEqual(['A-001']);
  expect(rows[0].description).toBe('Leave request');
  expect(rows[0].finalAnswer).toBeUndefined();
  expect(rows[0].history).toEqual([]);
  expect(JSON.stringify(rows)).not.toContain('Consultant-only AI question');
  expect(JSON.stringify(rows)).not.toContain('Policy request');
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).includes('sender=eq.agent'))).toBe(false);
  expect(readProofs).toHaveBeenCalledWith(['A-001']);
 });

 it('does not release any answer without matching success delivery proof', async () => {
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
   approval: deliveredApproval, delivery: null,
  }]]));
  let rows = await loadLiveConsultations(userB);
  expect(rows[0].finalAnswer).toBeUndefined();
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
   approval: deliveredApproval,
   delivery: { ...successfulDelivery, result: 'failed' },
  }]]));
  rows = await loadLiveConsultations(userB);
  expect(rows[0].finalAnswer).toBeUndefined();
 });

 it('releases only the immutable Supabase-approved content after successful delivery', async () => {
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
   approval: deliveredApproval, delivery: successfulDelivery,
  }]]));
  const rows = await loadLiveConsultations(userB);
  expect(rows[0].finalAnswer).toBe('verified snapshot');
  expect(rows[0].status).toBe('Approved');
  expect(rows[0].responseApproved).toBe(true);
  expect(rows[0].requesterEmail).toBeUndefined();
  expect(rows[0].history).toEqual([]);
  expect(JSON.stringify(rows)).not.toContain('Consultant-only AI question');
 });

 it('provides trusted approval revision to Consultant without releasing pending content to Users', async () => {
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
   approval: deliveredApproval, delivery: null,
  }]]));
  const adminRows = await loadLiveConsultations({ email: 'admin@example.com', role: 'Admin' });
  expect(adminRows.find(row => row.ticketId === 'B-001')?.revision).toBe(3);
  expect(readProofs).toHaveBeenCalledWith(['A-001', 'B-001']);
  const userRows = await loadLiveConsultations(userB);
  expect(userRows[0].finalAnswer).toBeUndefined();
  expect(userRows[0].history).toEqual([]);
 });

 it('lets Consultants review pending Supabase drafts without publishing them to Users', async () => {
  const consultant = { email: 'consultant@example.com', role: 'Consultant' as const };
  const rows = await loadLiveConsultations(consultant);
  expect(rows.map(row => row.ticketId)).toEqual(['A-001', 'B-001']);
  const draft = rows.find(row => row.ticketId === 'A-001');
  expect(draft?.history).toEqual([{ type: 'ADVICE', content: 'Consultant-only AI question', round: 1 }]);
  expect(draft?.draftOptions).toEqual(['Option A', 'Option B']);
  expect(draft?.draftVersion).toBe(draftVersion({ Request_Text: 'Leave request' }, agentDraft));
  expect(draft?.requesterEmail).toBe('a@example.com');
  expect(vi.mocked(db).mock.calls.some(([path]) => String(path).includes('sender=eq.agent'))).toBe(true);
 });

 it('includes only the owner display name, never another owner or PIN register', async () => {
  vi.mocked(readPasscodeAccounts).mockResolvedValue([
   { email: 'a@example.com', role: 'User', status: 'Active', name: 'မောင်မောင်' },
   { email: 'b@example.com', role: 'User', status: 'Active', name: 'Other user' },
  ]);
  const rows = await loadLiveConsultations(userA);
  expect(rows[0].requesterName).toBe('မောင်မောင်');
  expect(JSON.stringify(rows)).not.toMatch(/1234|5678|Other user/);
 });

 it('uses the verified account ID when the bounded owner-email lookup omits the owner', async () => {
  accounts = [];
  const rows = await loadLiveConsultations(userA);
  expect(rows.map(row => row.ticketId)).toEqual(['A-001']);
  expect(rows[0].requesterEmail).toBeUndefined();
  expect(rows[0].description).toBe('Leave request');
  const another = await loadLiveConsultations(userB);
  expect(another.map(row => row.ticketId)).toEqual(['B-001']);
 });

 it('suppresses a released answer while a new user turn is pending sync', async () => {
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001', {
   approval: deliveredApproval, delivery: successfulDelivery,
  }]]));
  vi.mocked(readConversations).mockResolvedValue(new Map([['B-001', {
   request_id: 'B-001', original_request: 'Policy request',
   entries: [{ role: 'user', content: 'Follow-up', revision: 3 }],
   reply_revision: 3, pending_sync: true, closed_at: null, close_reason: null,
  }]]));
  const rows = await loadLiveConsultations(userB);
  expect(rows[0].status).toBe('Submitted');
  expect(rows[0].finalAnswer).toBeUndefined();
  expect(rows[0].responseApproved).toBe(false);
 });
});
