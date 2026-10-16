import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadLiveConsultations } from './liveConsultation';
import { readTickets, readProofs } from './pocketHrData';
vi.mock('./conversationLifecycle',async(importOriginal)=>({...await importOriginal<typeof import('./conversationLifecycle')>(),readConversations:vi.fn(async()=>new Map())}));
vi.mock('./pocketHrData', () => ({ readTickets:vi.fn(), readProofs:vi.fn() }));
const sheetRows = [
 { 'Row ID':'A-001',Owner_Email:'a@example.com',Ticket_Title:'Leave request',Ticket_Status:'Awaiting Review',AI_Answer:'SECRET AI DRAFT',Final_Answer:'NOT APPROVED' },
 { 'Row ID':'B-001',Owner_Email:'b@example.com',Ticket_Title:'Policy request',Ticket_Status:'Approved',Final_Answer:'SHEET APPROVED ANSWER' },
];
describe('live Sheet consultation projection',()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(readTickets).mockResolvedValue(sheetRows);
  vi.mocked(readProofs).mockResolvedValue(new Map());
 });
 it('rejects unauthenticated principals before reading Sheet',async()=>{
  await expect(loadLiveConsultations(null as never)).rejects.toThrow('verified_principal_required');
  expect(readTickets).not.toHaveBeenCalled();
 });
 it('enforces owner isolation and never leaks AI draft or unapproved answer',async()=>{
  const rows=await loadLiveConsultations({email:'a@example.com',role:'User'});
  expect(rows.map(r=>r.ticketId)).toEqual(['A-001']);
  expect(rows[0].finalAnswer).toBeUndefined();
  expect(JSON.stringify(rows)).not.toContain('SECRET AI DRAFT');
  expect(readProofs).not.toHaveBeenCalled();
 });
 it('withholds a Sheet answer without approval and delivery proof',async()=>{
  const rows=await loadLiveConsultations({email:'b@example.com',role:'User'});
  expect(rows[0].finalAnswer).toBeUndefined();
  expect(readProofs).toHaveBeenCalledWith(['B-001']);
 });
 it.each(['Approved','Resolved'])('releases only the approved snapshot in %s state',async(status)=>{
  vi.mocked(readTickets).mockResolvedValue([{...sheetRows[1],Ticket_Status:status}]);
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001',{
   approval:{requestId:'B-001',revision:3,approvedContent:'verified snapshot',approvedByAccountId:'consultant',approvedAt:'2026-10-15T00:00:00Z'},
   delivery:{requestId:'B-001',revision:3,result:'success',deliveredAt:'2026-10-15T00:00:01Z'}
  }]]));
  const rows=await loadLiveConsultations({email:'b@example.com',role:'User'});
  expect(rows[0].finalAnswer).toBe('verified snapshot');
  expect(JSON.stringify(rows)).not.toContain('SHEET APPROVED ANSWER');
 });
 it('provides latest revision to Admin without exposing revision in User response',async()=>{
  vi.mocked(readProofs).mockResolvedValue(new Map([['B-001',{
   approval:{requestId:'B-001',revision:3,approvedContent:'snapshot',approvedByAccountId:'legacy',approvedAt:'2026-10-14T08:00:00Z'},delivery:null
  }]]));
  const rows=await loadLiveConsultations({email:'admin@example.com',role:'Admin'});
  expect(rows.find(r=>r.ticketId==='B-001')?.revision).toBe(3);
  expect(readProofs).toHaveBeenCalledWith(['A-001','B-001']);
 });
});
