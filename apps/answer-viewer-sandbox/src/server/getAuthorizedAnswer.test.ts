import { describe, expect, it } from 'vitest';
import { createViewerToken } from './viewerToken';
import { getAuthorizedAnswer } from './getAuthorizedAnswer';
import type { TicketRepository } from './ticketRepository';
import type { TicketRow } from './ticketRow';

const secret = 'test-secret-value-that-is-long-enough';
const resolved: TicketRow = {
  Ticket_ID: 'ticket-123',
  Ticket_Title: 'Leave request',
  Ticket_Status: 'Resolved',
  Final_Answer: 'Approved final answer',
  Sheet_AI_Answer: 'NEVER EXPOSE',
  Updated_At: '2026-09-25T08:10:00.000Z',
};

function repo(row: TicketRow | null): TicketRepository {
  return { getByTicketId: async () => row };
}

describe('getAuthorizedAnswer', () => {
  it('denies pending review even when an AI draft exists', async () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1000, ttlSeconds: 60, secret, nonce: 'n' });
    const result = await getAuthorizedAnswer({ token, now: 1010, secret, repository: repo({ ...resolved, Ticket_Status: 'Pending_Review', Final_Answer: null }) });
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain('NEVER EXPOSE');
  });

  it('denies non-resolved ticket even when Final_Answer exists', async () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1000, ttlSeconds: 60, secret, nonce: 'n' });
    const result = await getAuthorizedAnswer({ token, now: 1010, secret, repository: repo({ ...resolved, Ticket_Status: 'Submitted' }) });
    expect(result.ok).toBe(false);
  });

  it('returns approved projection for a valid resolved ticket', async () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1000, ttlSeconds: 60, secret, nonce: 'n' });
    const result = await getAuthorizedAnswer({ token, now: 1010, secret, repository: repo(resolved) });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.answer.finalAnswer).toBe('Approved final answer');
      expect(JSON.stringify(result.answer)).not.toContain('Sheet_AI_Answer');
    }
  });

  it('denies invalid, expired, cross-ticket, and reopened access', async () => {
    const valid = createViewerToken({ ticketId: 'ticket-123', now: 1000, ttlSeconds: 60, secret, nonce: 'n' });
    const other = createViewerToken({ ticketId: 'ticket-999', now: 1000, ttlSeconds: 60, secret, nonce: 'n2' });

    expect((await getAuthorizedAnswer({ token: 'bad', now: 1010, secret, repository: repo(resolved) })).ok).toBe(false);
    expect((await getAuthorizedAnswer({ token: valid, now: 1061, secret, repository: repo(resolved) })).ok).toBe(false);
    expect((await getAuthorizedAnswer({ token: other, now: 1010, secret, repository: repo(resolved) })).ok).toBe(false);
    expect((await getAuthorizedAnswer({ token: valid, now: 1010, secret, repository: repo({ ...resolved, Ticket_Status: 'Pending_Review' }) })).ok).toBe(false);
  });
});
