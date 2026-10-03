import { describe, expect, it } from 'vitest';
import { GoogleSheetTicketRepository } from './googleSheetTicketRepository';

describe('GoogleSheetTicketRepository', () => {
  it('performs exact ticket lookup and returns no fallback row', async () => {
    const calls: string[] = [];
    const repository = new GoogleSheetTicketRepository({
      getTicketById: async (ticketId) => {
        calls.push(ticketId);
        return ticketId === 'ticket-123'
          ? { Ticket_ID: 'ticket-123', Ticket_Status: 'Resolved', Final_Answer: 'ok' }
          : null;
      },
    });

    expect(await repository.getByTicketId('ticket-123')).toMatchObject({ Ticket_ID: 'ticket-123' });
    expect(await repository.getByTicketId('ticket-999')).toBeNull();
    expect(calls).toEqual(['ticket-123', 'ticket-999']);
  });

  it('rejects a transport row whose canonical id does not match the lookup', async () => {
    const repository = new GoogleSheetTicketRepository({
      getTicketById: async () => ({ Ticket_ID: 'ticket-other', Ticket_Status: 'Resolved', Final_Answer: 'wrong' }),
    });
    expect(await repository.getByTicketId('ticket-123')).toBeNull();
  });
});
