import type { TicketRepository } from './ticketRepository';
import type { TicketRow } from './ticketRow';

export interface GoogleSheetTicketTransport {
  getTicketById(ticketId: string): Promise<TicketRow | null>;
}

export class GoogleSheetTicketRepository implements TicketRepository {
  constructor(private readonly transport: GoogleSheetTicketTransport) {}

  async getByTicketId(ticketId: string): Promise<TicketRow | null> {
    const row = await this.transport.getTicketById(ticketId);
    if (!row) return null;
    const canonicalId = String(row.Ticket_ID ?? row.Row_ID ?? '').trim();
    return canonicalId === ticketId ? row : null;
  }
}
