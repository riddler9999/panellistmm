import { parseDraftResponse, type ResponseAttachment } from '../domain/reviewedResponse.js';
import { draftVersion } from './draftVersion.js';
import type { TicketRow } from './ticketRow';

export type Principal = { email: string; name?: string; role: 'Admin' | 'Consultant' | 'User' };
export type AuthenticatedPrincipal = Principal & { accountId: string };
export type ConsultationTicket = { ticketId: string; requesterName?: string; requesterEmail?:string; options?: string[]; attachments?: ResponseAttachment[]; draftOptions?: string[]; draftAttachments?: ResponseAttachment[]; draftVersion?: string; conversation?: Array<{role:'user'|'consultant';content:string;revision:number;attachments?:ResponseAttachment[];options?:string[]}>; responseApproved?: boolean; closed?: boolean; autoCloseAt?: string; syncPending?: boolean; revision?: number; title: string; status: string; finalAnswer?: string; approvedQuestion?: string; category?: string; createdAt?: string; description?: string; reviewStatus?: string; processingStatus?: string; artifact?: { type?: string; title?: string; format?: string; status?: string; url?: string }; history: Array<{ type: 'QUESTION' | 'ANSWER' | 'ADVICE'; content: string; round: number }> };
const validEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const string = (value: unknown) => typeof value === 'string' ? value.trim() : '';

export function resolvePrincipal(identity: { email?: unknown; verified?: boolean }, users: Array<{ email: string; role: string }>): Principal | null {
  if (identity.verified !== true || typeof identity.email !== 'string') return null;
  const email = identity.email.trim().toLowerCase();
  if (!validEmail(email)) return null;
  const matches = users.filter(user => user.email.trim().toLowerCase() === email);
  if (matches.length !== 1 || !['Admin', 'Consultant', 'User'].includes(matches[0].role)) return null;
  return { email, role: matches[0].role as Principal['role'] };
}

export function canAccessTicket(principal: Principal, ticket: TicketRow): boolean {
  if (principal.role !== 'User') return true;
  const owner = string(ticket.Owner_Email).toLowerCase();
  return !!owner && owner === principal.email;
}

export function projectConsultationTicket(principal: Principal, ticket: TicketRow): ConsultationTicket | null {
  if (!canAccessTicket(principal, ticket)) return null;
  // Google Sheets actual canonical key: Sheet1['Row ID']; Glide Tickets['🔒 Row ID'].
  const ticketId = string(ticket['Row ID'] ?? ticket.Row_ID ?? ticket.Ticket_ID);
  if (!ticketId) return null;
  const status = string(ticket.Ticket_Status);
  const projection: ConsultationTicket = {
    ticketId, title: string(ticket.Ticket_Title) || 'HR Consultation', status,
    category: string(ticket.Ticket_Category), createdAt: string(ticket.Created_At),
    description: string(ticket.Request_Text),
    requesterEmail: principal.role!=='User' ? string(ticket.Owner_Email) : undefined,
    reviewStatus: principal.role !== 'User' ? string(ticket.Review_Status) : undefined,
    processingStatus: principal.role !== 'User' ? string(ticket.Processing_Status) : undefined,
    artifact: principal.role !== 'User' ? {
      type: string(ticket.Artifact_Type), title: string(ticket.Artifact_Title),
      format: string(ticket.Artifact_Format), status: string(ticket.Artifact_Status),
      // A Sheet URL is untrusted and never automatically published or linked.
    } : undefined,
    history: [],
  };
  // AI_Answer is an unapproved draft in the currently running n8n integration.
  // It is never included in a User response. Consultant receives it only after server authorization.
  if (principal.role !== 'User') {
    projection.draftVersion = draftVersion(ticket);
    const draft = string(ticket.Consultant_Answer) || string(ticket.Clarification_Question) || string(ticket.AI_Answer) || string(ticket.Sheet_AI_Answer);
    if (draft) {const response=parseDraftResponse(draft); projection.history.push({ type: 'ADVICE', content: response.text, round: 0 });projection.draftOptions=response.options;}

  }
  // Sheet1 currently has no Approval_Status/Approved_Question columns. Never infer
  // approval from Ticket_Status or the presence of Final_Answer alone.
  // The production bridge has Review_Status, but no independently verified
  // release/delivery acknowledgement contract. Never infer publication from
  // a reviewed status or from a populated Final_Answer cell.
  // User-facing content remains withheld until that contract is implemented.
  return projection;
}

export function projectTicketList(principal: Principal, rows: TicketRow[]): ConsultationTicket[] {
  return rows.map(row => projectConsultationTicket(principal, row)).filter((row): row is ConsultationTicket => row !== null);
}
