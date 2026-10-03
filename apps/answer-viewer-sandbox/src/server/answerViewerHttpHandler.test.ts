import { describe, expect, it } from 'vitest';
import { createViewerToken } from './viewerToken';
import { handleAnswerViewerHttpRequest } from './answerViewerHttpHandler';

const secret = 'test-secret-value-that-is-long-enough';
const repository = {
  getByTicketId: async (ticketId: string) => ticketId === 'ticket-123'
    ? {
      Ticket_ID: 'ticket-123',
      Ticket_Title: 'Leave request',
      Ticket_Status: 'Delivered',
      Final_Answer: 'Approved',
      Sheet_AI_Answer: 'SECRET DRAFT',
      Consultant_Answer: 'SECRET WORKING TEXT',
      Updated_At: '2026-09-25T08:00:00.000Z',
    }
    : null,
};

describe('handleAnswerViewerHttpRequest', () => {
  it('accepts bearer authorization and returns only approved projected data', async () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1000, ttlSeconds: 60, secret, nonce: 'n' });
    const response = await handleAnswerViewerHttpRequest({
      authorization: `Bearer ${token}`,
      now: 1010,
      secret,
      repository,
    });
    expect(response.status).toBe(200);
    expect(response.headers['Cache-Control']).toContain('no-store');
    expect(JSON.stringify(response.body)).toContain('Approved');
    expect(JSON.stringify(response.body)).not.toContain('SECRET DRAFT');
    expect(JSON.stringify(response.body)).not.toContain('SECRET WORKING TEXT');
  });

  it('collapses missing/invalid authorization to a generic unavailable response', async () => {
    for (const authorization of [undefined, '', 'Bearer garbage']) {
      const response = await handleAnswerViewerHttpRequest({ authorization, now: 1010, secret, repository });
      expect(response).toMatchObject({ status: 404, body: { error: 'answer_unavailable' } });
    }
  });
});
