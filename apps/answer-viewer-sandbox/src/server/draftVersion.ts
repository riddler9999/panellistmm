import { createHash } from 'node:crypto';
import type { TicketRow } from './ticketRow';
export function draftVersion(ticket: TicketRow, messageContent?: string): string {
 return createHash('sha256').update(JSON.stringify([
  ticket.Request_Text, ticket.Consultant_Answer, ticket.Clarification_Question,
  ticket.AI_Answer, ticket.Sheet_AI_Answer, ticket.Review_Status, messageContent ?? null,
 ])).digest('hex');
}
