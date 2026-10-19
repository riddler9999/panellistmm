import { decodeResponse } from '../domain/reviewedResponse.js';
import { readConversations, shouldAutoClose, AUTO_CLOSE_MS } from './conversationLifecycle.js';
import { canAccessTicket, projectConsultationTicket, type Principal, type ConsultationTicket } from './consultationAccess.js';
import { readTickets, readProofs, readPasscodeAccounts } from './pocketHrData.js';
import { releasedAnswer } from './deliveryPolicy.js';

/** Server-only live data assembler. Caller MUST authenticate principal independently of URL/email. */
export async function loadLiveConsultations(principal: Principal): Promise<ConsultationTicket[]> {
  if (!principal || !['Admin', 'User'].includes(principal.role) || !principal.email?.trim()) {
    throw new Error('verified_principal_required');
  }
  const rows = (await readTickets()).filter(row => canAccessTicket(principal, row));
  const proofs: Awaited<ReturnType<typeof readProofs>> = new Map();
  const ids = rows
    .filter(row => principal.role !== 'User' || ['Approved','Resolved','Closed','Delivered'].includes(String(row.Ticket_Status).trim()))
    .map(row => String(row['Row ID'] ?? '').trim());
  for (let i = 0; i < ids.length; i += 200) {
    const batch = await readProofs(ids.slice(i,i+200));
    for (const [id, proof] of batch) proofs.set(id, proof);
  }
  const accounts=await readPasscodeAccounts();
  const conversations=await readConversations(rows.map(row=>String(row['Row ID'])));
  return rows.flatMap(row => {
    const ticket = projectConsultationTicket(principal, row);
    if (!ticket) return [];
    const ownerAccounts=accounts.filter(account=>account.email===String(row.Owner_Email??'').trim().toLowerCase());
    ticket.requesterName=ownerAccounts.length===1 ? ownerAccounts[0].name || undefined : undefined;
    ticket.revision = proofs.get(ticket.ticketId)?.approval?.revision ?? 0;
    // Sheet controls lifecycle; immutable approval + matching delivery control release.
    if (['Approved','Resolved','Closed','Delivered'].includes(String(row.Ticket_Status ?? '').trim())) {
      const proof = proofs.get(ticket.ticketId);
      const answer = releasedAnswer(principal, row, proof?.approval ?? null, proof?.delivery ?? null);
      if (answer) {const response=decodeResponse(answer);ticket.finalAnswer=response.text;ticket.options=response.options;ticket.attachments=response.attachments;}
    }
    const state = conversations.get(ticket.ticketId);
    const proof = proofs.get(ticket.ticketId);
    if (principal.role!=='User' && proof?.approval && (state?.reply_revision??0)<proof.approval.revision && !ticket.finalAnswer) {const response=decodeResponse(proof.approval.approvedContent);ticket.history=[{type:'ADVICE',content:response.text,round:proof.approval.revision}];ticket.draftOptions=response.options;ticket.draftAttachments=response.attachments;}
    ticket.description = state?.original_request ?? ticket.description;
    ticket.conversation = state?.entries ?? [];
    ticket.syncPending = state?.pending_sync ?? false;
    ticket.responseApproved = !!ticket.finalAnswer && (state?.reply_revision ?? 0) < (proof?.approval?.revision ?? 0);
    const timedOut = ticket.responseApproved && shouldAutoClose(proof?.delivery?.deliveredAt);
    ticket.closed = !!state?.closed_at || ['Resolved','Closed'].includes(ticket.status) || !!timedOut;
    if (ticket.closed) ticket.status = 'Closed';
    if (ticket.responseApproved && proof?.delivery?.deliveredAt) ticket.autoCloseAt = new Date(Date.parse(proof.delivery.deliveredAt) + AUTO_CLOSE_MS).toISOString();
    if (state?.pending_sync) { ticket.status = 'Submitted'; ticket.history = []; ticket.finalAnswer = undefined; ticket.responseApproved = false; }
    return [ticket];
  });
}
