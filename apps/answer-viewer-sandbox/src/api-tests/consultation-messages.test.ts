import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-messages';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readTickets } from '../server/pocketHrData';

vi.mock('../server/passcodeAuth', () => ({ authenticatedPrincipal: vi.fn() }));
vi.mock('../server/pocketHrData', () => ({ db: vi.fn(), readTickets: vi.fn() }));
const headers = { cookie: 'pocket_hr_session=synthetic' };
const rows = [{ 'Row ID': 'R-1', Owner_Email: 'owner@example.com' }];
const messages = [
 { message_id: 'u', request_id: 'R-1', sender: 'user', content: 'Question', review_state: null, approved_content: null, publication_revision: null, created_at: '2026-10-19T00:00:00Z' },
 { message_id: 'a', request_id: 'R-1', sender: 'agent', content: 'SECRET DRAFT', review_state: 'pending_review', approved_content: null, publication_revision: null, created_at: '2026-10-19T00:01:00Z' },
 { message_id: 'b', request_id: 'R-1', sender: 'agent', content: 'SECRET ORIGINAL', review_state: 'approved', approved_content: 'Reviewed answer', publication_revision: 1, created_at: '2026-10-19T00:02:00Z' },
];
async function call(query: Record<string, unknown> = { requestId: 'R-1' }) {
 let status = 200; let body: any;
 const res = { status(n: number) { status=n; return res; }, setHeader() {}, json(v: unknown) { body=v; } };
 await handler({method:'GET',headers,query},res);
 return {status,body};
}
describe('consultation messages access and release', () => {
 beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'owner@example.com'});
  vi.mocked(readTickets).mockResolvedValue(rows);
  vi.mocked(db).mockImplementation(async (path: string) => {
   if (path.startsWith('pocket_hr_messages?')) return messages;
   if (path.startsWith('pocket_hr_deliveries?')) return [{request_id:'R-1',revision:1,result:'success',delivered_at:'2026-10-19T00:03:00Z'}];
   if (path.startsWith('pocket_hr_approvals?')) return [{request_id:'R-1',revision:1,approved_content:'Reviewed answer',approved_by_email:'reviewer@example.com',approved_at:'2026-10-19T00:02:30Z'}];
   throw Error('unexpected_query');
  });
 });
 it('denies anonymous and other owners before message lookup', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValueOnce(null);
  expect((await call()).status).toBe(403);
  vi.mocked(authenticatedPrincipal).mockResolvedValueOnce({role:'User',email:'other@example.com'});
  expect((await call()).status).toBe(404);
  expect(db).not.toHaveBeenCalled();
 });
 it('shows only owned user messages and successfully delivered approved content', async () => {
  const {status,body}=await call();
  expect(status).toBe(200);
  expect(body.messages).toEqual([
   expect.objectContaining({sender:'user',content:'Question'}),
   expect.objectContaining({sender:'agent',content:'Reviewed answer'}),
  ]);
  expect(JSON.stringify(body)).not.toContain('SECRET');
 });
 it('withholds approved content without matching successful delivery proof', async () => {
  vi.mocked(db).mockImplementation(async (path: string) => {
   if(path.startsWith('pocket_hr_messages?')) return messages;
   return [];
  });
  const {status,body}=await call();
  expect(status).toBe(200);
  expect(body.messages).toHaveLength(1);
  expect(JSON.stringify(body)).not.toContain('Reviewed answer');
 });
 it('allows authenticated Admin to inspect pending drafts', async () => {
  vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'Admin',email:'admin@example.com'});
  const {status,body}=await call();
  expect(status).toBe(200);
  expect(body.messages).toHaveLength(3);
  expect(body.messages[1].content).toBe('SECRET DRAFT');
 });
});
