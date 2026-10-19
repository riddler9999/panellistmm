import { decodeResponse, parseDraftResponse } from '../domain/reviewedResponse.js';
import { readConversations, shouldAutoClose, AUTO_CLOSE_MS } from './conversationLifecycle.js';
import { canAccessTicket, projectConsultationTicket, type Principal, type ConsultationTicket } from './consultationAccess.js';
import { db, readProofs, readPasscodeAccounts } from './pocketHrData.js';
import type { TicketRow } from './ticketRow.js';
import { draftVersion } from './draftVersion.js';
import { releasedAnswer } from './deliveryPolicy.js';

/** Server-only live data assembler. Caller MUST authenticate principal independently of URL/email. */
export async function loadLiveConsultations(principal: Principal): Promise<ConsultationTicket[]> {
  if (!principal || !['Admin', 'Consultant', 'User'].includes(principal.role) || !principal.email?.trim()) {
    throw new Error('verified_principal_required');
  }
  // Supabase is authoritative for new requests. The legacy Sheet bridge may
  // contain blank/duplicate row IDs and must not take the live dashboard down.
  // Ownership is resolved from verified session identity, never URL parameters.
  const requestRows = await db<Array<{request_id:string;owner_account_id:string;created_at:string}>>(
    'pocket_hr_requests?select=request_id,owner_account_id,created_at&order=created_at.desc&limit=1000',
  );
  const accountsForOwners = await db<Array<{id:string;email:string}>>(
    'pocket_hr_accounts?select=id,email&limit=1000',
  );
  const ownerById = new Map(accountsForOwners.map(account => [account.id, account.email.trim().toLowerCase()]));
  const accessible = requestRows.filter(request =>
    principal.role !== 'User' ||
    ('accountId' in principal && request.owner_account_id === principal.accountId) ||
    ownerById.get(request.owner_account_id) === principal.email.trim().toLowerCase()
  );
  const idsForMessages = accessible.map(request => request.request_id);
  const firstUserMessage = new Map<string,string>();
  for (let i = 0; i < idsForMessages.length; i += 200) {
    const batch = idsForMessages.slice(i,i+200);
    const filter = batch.map(id => JSON.stringify(id)).join(',');
    const messages = await db<Array<{request_id:string;content:string}>>(
      'pocket_hr_messages?select=request_id,content&sender=eq.user&request_id=in.(' + encodeURIComponent(filter) + ')&order=created_at.asc&limit=1000',
    );
    for (const message of messages) if (batch.includes(message.request_id) && !firstUserMessage.has(message.request_id))
      firstUserMessage.set(message.request_id, message.content);
  }
  const rows: TicketRow[] = accessible.map(request => ({
    'Row ID': request.request_id,
    Owner_Email: ownerById.get(request.owner_account_id) ?? '',
    Ticket_Title: 'HR Consultation',
    Ticket_Status: 'Submitted',
    Ticket_Category: '',
    Request_Text: firstUserMessage.get(request.request_id) ?? '',
    Created_At: request.created_at,
  })).filter(row => canAccessTicket(principal, row));
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
  const pendingDrafts=new Map<string,{content:string;revision:number}>();
  if(principal.role!=='User') {
    const ids=rows.map(row=>String(row['Row ID']??'').trim()).filter(Boolean);
    for(let i=0;i<ids.length;i+=200) {
      const batch=ids.slice(i,i+200);
      const filter=batch.map(id=>'"'+id.replace(/\\/g,'\\\\').replace(/"/g,'\\"')+'"').join(',');
      const messages=await db<Array<{request_id:string;content:string;revision:number}>>(
        'pocket_hr_messages?select=request_id,content,revision&sender=eq.agent&review_state=eq.pending_review&request_id=in.('+encodeURIComponent(filter)+')&order=revision.desc,created_at.desc&limit=1000'
      );
      for(const message of messages) if(batch.includes(message.request_id)&&!pendingDrafts.has(message.request_id))
        pendingDrafts.set(message.request_id,{content:message.content,revision:message.revision});
    }
  }
  return rows.flatMap(row => {
    const ticket = projectConsultationTicket(principal, row);
    if (!ticket) return [];
    const messageDraft=pendingDrafts.get(ticket.ticketId);
    if(messageDraft) {
      const draft=parseDraftResponse(messageDraft.content);
      ticket.history=[{type:'ADVICE',content:draft.text,round:messageDraft.revision}];
      ticket.draftOptions=draft.options;
      ticket.draftAttachments=draft.attachments;
      ticket.draftVersion=draftVersion(row,messageDraft.content);
    }
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
