import type { TicketRow } from './ticketRow';

export type Principal = { email: string; role: 'Admin' | 'User' };
export type ConsultationTicket = Pick<TicketRow, 'Ticket_ID' | 'Row_ID' | 'Ticket_Title' | 'Ticket_Status'> & {
  ticketId: string; title: string; status: string; finalAnswer?: string;
  approvedQuestion?: string; history: Array<{ type: 'QUESTION' | 'ANSWER' | 'ADVICE'; content: string; round: number }>;
};

const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export function resolvePrincipal(identity: { email?: unknown; verified?: boolean }, users: Array<{ email: string; role: string }>): Principal | null {
  if (identity.verified !== true || typeof identity.email !== 'string') return null;
  const email = identity.email.trim().toLowerCase();
  if (!validEmail(email)) return null;
  const matches = users.filter(user => user.email.trim().toLowerCase() === email);
  if (matches.length !== 1 || !['Admin', 'User'].includes(matches[0].role)) return null;
  return { email, role: matches[0].role as Principal['role'] };
}

export function canAccessTicket(principal: Principal, ticket: TicketRow): boolean {
  if (principal.role === 'Admin') return true;
  const owner = String(ticket.Owner_Email ?? '').trim().toLowerCase();
  return !!owner && owner === principal.email;
}

export function projectConsultationTicket(principal: Principal, ticket: TicketRow): ConsultationTicket | null {
  if (!canAccessTicket(principal, ticket)) return null;
  const ticketId = String(ticket.Ticket_ID ?? ticket.Row_ID ?? '').trim();
  if (!ticketId) return null;
  const status = String(ticket.Ticket_Status ?? '').trim();
  const projection: ConsultationTicket = {
    ticketId, title: String(ticket.Ticket_Title ?? 'HR Consultation'), status,
    Ticket_ID: ticket.Ticket_ID, Row_ID: ticket.Row_ID,
    Ticket_Title: ticket.Ticket_Title, Ticket_Status: ticket.Ticket_Status,
    history: [],
  };
  // Only independently approved fields may enter a normal user's response.
  if (principal.role === 'Admin') {
    const draft = String(ticket.AI_Answer ?? ticket.Sheet_AI_Answer ?? '').trim();
    if (draft) projection.history.push({ type: 'ADVICE', content: draft, round: 0 });
  }
  if (String(ticket.Approval_Status ?? '').trim() === 'Approved') {
    const question = String(ticket.Approved_Question ?? '').trim();
    if (question) projection.approvedQuestion = question;
    const answer = String(ticket.Final_Answer ?? '').trim();
    if (answer && ['Delivered', 'Resolved'].includes(status)) projection.finalAnswer = answer;
  }
  return projection;
}

export function projectTicketList(principal: Principal, rows: TicketRow[]): ConsultationTicket[] {
  return rows.map(row => projectConsultationTicket(principal, row)).filter((row): row is ConsultationTicket => row !== null);
}
