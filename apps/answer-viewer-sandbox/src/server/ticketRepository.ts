import type { TicketRow } from './ticketRow';

export interface TicketRepository {
  getByTicketId(ticketId: string): Promise<TicketRow | null>;
}
