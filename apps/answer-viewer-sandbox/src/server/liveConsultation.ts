import { canAccessTicket, projectConsultationTicket, type Principal, type ConsultationTicket } from './consultationAccess.js';
import { readTickets, readProofs } from './pocketHrData.js';
import { releasedAnswer } from './deliveryPolicy.js';

/** Server-only live data assembler. Caller MUST authenticate principal independently of URL/email. */
export async function loadLiveConsultations(principal: Principal): Promise<ConsultationTicket[]> {
  if (!principal || !['Admin', 'User'].includes(principal.role) || !principal.email?.trim()) {
    throw new Error('verified_principal_required');
  }
  const rows = (await readTickets()).filter(row => canAccessTicket(principal, row));
  const proofs: Awaited<ReturnType<typeof readProofs>> = new Map();
  const ids = rows
    .filter(row => principal.role === 'Admin' || ['Approved','Resolved'].includes(String(row.Ticket_Status).trim()))
    .map(row => String(row['Row ID'] ?? '').trim());
  for (let i = 0; i < ids.length; i += 200) {
    const batch = await readProofs(ids.slice(i,i+200));
    for (const [id, proof] of batch) proofs.set(id, proof);
  }
  return rows.flatMap(row => {
    const ticket = projectConsultationTicket(principal, row);
    if (!ticket) return [];
    if (principal.role === 'Admin') ticket.revision = proofs.get(ticket.ticketId)?.approval?.revision ?? 0;
    // Sheet controls lifecycle; immutable approval + matching delivery control release.
    if (['Approved','Resolved'].includes(String(row.Ticket_Status ?? '').trim())) {
      const proof = proofs.get(ticket.ticketId);
      const answer = releasedAnswer(principal, row, proof?.approval ?? null, proof?.delivery ?? null);
      if (answer) ticket.finalAnswer = answer;
    }
    return [ticket];
  });
}
