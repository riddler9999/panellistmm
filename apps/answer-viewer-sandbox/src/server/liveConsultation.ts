import { canAccessTicket, projectConsultationTicket, type Principal, type ConsultationTicket } from './consultationAccess';
import { releasedAnswer } from './deliveryPolicy';
import { readTickets, readProofs } from './pocketHrData';

/** Server-only live data assembler. Caller MUST authenticate principal independently of URL/email. */
export async function loadLiveConsultations(principal: Principal): Promise<ConsultationTicket[]> {
  if (!principal || !['Admin', 'User'].includes(principal.role) || !principal.email?.trim()) {
    throw new Error('verified_principal_required');
  }
  const rows = (await readTickets()).filter(row => canAccessTicket(principal, row));
  const ids = rows.map(row => String(row['Row ID'] ?? '').trim());
  const proofs = new Map<string, Awaited<ReturnType<typeof readProofs>> extends Map<string, infer T> ? T : never>();
  for (let i = 0; i < ids.length; i += 200) {
    const batch = await readProofs(ids.slice(i, i + 200));
    for (const [id, proof] of batch) proofs.set(id, proof);
  }
  return rows.flatMap(row => {
    const ticket = projectConsultationTicket(principal, row);
    if (!ticket) return [];
    const proof = proofs.get(ticket.ticketId);
    const answer = releasedAnswer(principal, row, proof?.approval ?? null, proof?.delivery ?? null);
    if (answer) ticket.finalAnswer = answer;
    return [ticket];
  });
}
