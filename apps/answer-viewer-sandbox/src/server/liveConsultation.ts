import { canAccessTicket, projectConsultationTicket, type Principal, type ConsultationTicket } from './consultationAccess.js';
import { readTickets, readProofs } from './pocketHrData.js';

/** Server-only live data assembler. Caller MUST authenticate principal independently of URL/email. */
export async function loadLiveConsultations(principal: Principal): Promise<ConsultationTicket[]> {
  if (!principal || !['Admin', 'User'].includes(principal.role) || !principal.email?.trim()) {
    throw new Error('verified_principal_required');
  }
  const rows = (await readTickets()).filter(row => canAccessTicket(principal, row));
  const proofs: Awaited<ReturnType<typeof readProofs>> = new Map();
  if (principal.role === 'Admin') {
    const ids = rows.map(row => String(row['Row ID'] ?? '').trim());
    for (let i = 0; i < ids.length; i += 200) {
      const batch = await readProofs(ids.slice(i,i+200));
      for (const [id, proof] of batch) proofs.set(id, proof);
    }
  }
  return rows.flatMap(row => {
    const ticket = projectConsultationTicket(principal, row);
    if (!ticket) return [];
    if (principal.role === 'Admin') ticket.revision = proofs.get(ticket.ticketId)?.approval?.revision ?? 0;
    // Sheet is the publication source of truth. Never release AI drafts.
    if (String(row.Ticket_Status ?? '').trim() === 'Approved') {
      const answer = String(row.Final_Answer ?? '').trim();
      if (answer) ticket.finalAnswer = answer;
    }
    return [ticket];
  });
}
