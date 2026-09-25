import type { GoogleSheetTicketTransport } from './googleSheetTicketRepository';
import type { TicketRow } from './ticketRow';

export class HttpTicketTransport implements GoogleSheetTicketTransport {
  constructor(
    private readonly endpoint: string,
    private readonly authToken: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async getTicketById(ticketId: string): Promise<TicketRow | null> {
    const url = new URL(this.endpoint);
    url.searchParams.set('ticket_id', ticketId);
    const response = await this.fetchImpl(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.authToken}`,
      },
      cache: 'no-store',
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('ticket source unavailable');
    const payload = await response.json() as { ticket?: TicketRow | null };
    return payload.ticket ?? null;
  }
}
