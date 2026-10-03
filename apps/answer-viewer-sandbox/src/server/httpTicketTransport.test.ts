import { describe, expect, it, vi } from 'vitest';
import { HttpTicketTransport } from './httpTicketTransport';

describe('HttpTicketTransport', () => {
  it('requests one exact ticket server-side without exposing the auth token in the URL', async () => {
    const fakeFetch = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain('ticket_id=ticket-123');
      expect(url).not.toContain('super-secret');
      expect(init?.headers).toMatchObject({ Authorization: 'Bearer super-secret' });
      return new Response(JSON.stringify({ ticket: { Ticket_ID: 'ticket-123', Ticket_Status: 'Delivered', Final_Answer: 'ok' } }), { status: 200 });
    });
    const transport = new HttpTicketTransport('https://private.example.test/ticket', 'super-secret', fakeFetch as typeof fetch);
    expect(await transport.getTicketById('ticket-123')).toMatchObject({ Ticket_ID: 'ticket-123' });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it('maps source 404 to null and hides upstream details on errors', async () => {
    const missing = new HttpTicketTransport('https://private.example.test/ticket', 'secret', vi.fn(async () => new Response('', { status: 404 })) as typeof fetch);
    expect(await missing.getTicketById('ticket-x')).toBeNull();

    const failing = new HttpTicketTransport('https://private.example.test/ticket', 'secret', vi.fn(async () => new Response('sensitive upstream error', { status: 500 })) as typeof fetch);
    await expect(failing.getTicketById('ticket-x')).rejects.toThrow('ticket source unavailable');
  });
});
