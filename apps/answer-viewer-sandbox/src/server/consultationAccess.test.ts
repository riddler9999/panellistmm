import { describe, expect, it } from 'vitest';
import { resolvePrincipal, projectTicketList, projectConsultationTicket } from './consultationAccess';
import type { TicketRow } from './ticketRow';
const users = [{ email: 'a@example.com', role: 'User' },{ email: 'b@example.com', role: 'User' },{ email: 'admin@example.com', role: 'Admin' },{ email: 'assistant@example.com', role: 'Assistant' }];
const tickets: TicketRow[] = [
  { 'Row ID': 'a', Owner_Email: 'a@example.com', Ticket_Title: 'A', Ticket_Status: 'Awaiting Review', AI_Answer: 'SECRET DRAFT' },
  { 'Row ID': 'b', Owner_Email: 'b@example.com', Ticket_Title: 'B', Ticket_Status: 'Approved', Final_Answer: 'UNRELEASED FINAL', Review_Status: 'Approved' },
];
describe('consultation access boundary', () => {
  it('requires verified identity, never editable email or role alone', () => {
    expect(resolvePrincipal({email:'admin@example.com'}, users)).toBeNull();
    expect(resolvePrincipal({email:'admin@example.com',verified:false}, users)).toBeNull();
    expect(resolvePrincipal({email:'assistant@example.com',verified:true}, users)).toBeNull();
    expect(resolvePrincipal({email:'unknown@example.com',verified:true}, users)).toBeNull();
    expect(resolvePrincipal({email:'a@example.com',verified:true}, users)).toEqual({email:'a@example.com',role:'User'});
  });
  it('isolates ticket lists, direct IDs, and drafts using actual Sheet1 Row ID', () => {
    const a = resolvePrincipal({email:'a@example.com',verified:true},users)!;
    expect(projectTicketList(a,tickets).map(t=>t.ticketId)).toEqual(['a']);
    expect(projectConsultationTicket(a,tickets[1])).toBeNull();
    expect(JSON.stringify(projectTicketList(a,tickets))).not.toContain('SECRET DRAFT');
  });
  it('admin sees all tickets and consultant-only drafts', () => {
    const admin = resolvePrincipal({email:'admin@example.com',verified:true},users)!;
    expect(projectTicketList(admin,tickets)).toHaveLength(2);
    expect(JSON.stringify(projectTicketList(admin,tickets))).toContain('SECRET DRAFT');
  });
  it('never exposes unapproved final advice, even with delivered status', () => {
    const a = resolvePrincipal({email:'a@example.com',verified:true},users)!;
    expect(projectConsultationTicket(a,{...tickets[0],Ticket_Status:'Approved',Final_Answer:'UNAPPROVED'})).not.toHaveProperty('finalAnswer');
  });
  it('withholds user-facing answers until separate delivery proof exists', () => {
    const user = resolvePrincipal({email:'b@example.com',verified:true},users)!;
    const candidate = { ...tickets[1], Review_Status:'Approved', Approval_Status:'Approved',
      Approved_Question:'INTERNAL QUESTION', Final_Answer:'INTERNAL FINAL', Ticket_Status:'Delivered' };
    const response = projectConsultationTicket(user,candidate)!;
    expect(response).not.toHaveProperty('approvedQuestion');
    expect(response).not.toHaveProperty('finalAnswer');
    expect(JSON.stringify(response)).not.toContain('INTERNAL FINAL');
    expect(JSON.stringify(response)).not.toContain('INTERNAL QUESTION');
  });
  it('preserves observed raw Sheet statuses without synthesizing a delivery status', () => {
    const admin = resolvePrincipal({email:'admin@example.com',verified:true},users)!;
    const statuses = ['Approved','Awaiting Review','ဖောင်ပို့ပြီး (Submitted)','Submitted','Failed',''];
    const rows = statuses.map((status,index) => ({ 'Row ID': 'r-' + index, Owner_Email: 'a@example.com', Ticket_Status: status }));
    expect(projectTicketList(admin, rows).map(row => row.status)).toEqual(statuses);
  });
  it('rejects spoofed admin roles and case-insensitively isolates owners', () => {
    const forgedIdentity = {email:'a@example.com',verified:true,role:'Admin'};
    expect(resolvePrincipal(forgedIdentity,users)).toEqual({email:'a@example.com',role:'User'});
    const user = resolvePrincipal({email:'A@EXAMPLE.COM',verified:true},users)!;
    expect(projectTicketList(user,[{'Row ID':'case',Owner_Email:'A@example.com'}])).toHaveLength(1);
  });
  it('does not mistake missing owner for public data', () => {
    const a = resolvePrincipal({email:'a@example.com',verified:true},users)!;
    expect(projectConsultationTicket(a,{ 'Row ID':'orphan', Ticket_Title:'Orphan' })).toBeNull();
  });
});
