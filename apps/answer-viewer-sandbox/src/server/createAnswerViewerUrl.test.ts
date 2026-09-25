import { describe, expect, it } from 'vitest';
import { createAnswerViewerUrl } from './createAnswerViewerUrl';

describe('createAnswerViewerUrl', () => {
  it('creates a complete signed URL without answer content', () => {
    const a = createAnswerViewerUrl({
      ticketId: 'ticket-123',
      baseUrl: 'https://viewer.example.com',
      now: 1000,
      ttlSeconds: 3600,
      secret: 'test-secret-value-that-is-long-enough',
    });
    const b = createAnswerViewerUrl({
      ticketId: 'ticket-123',
      baseUrl: 'https://viewer.example.com/',
      now: 1000,
      ttlSeconds: 3600,
      secret: 'test-secret-value-that-is-long-enough',
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^https:\/\/viewer\.example\.com\/answer\//);
    expect(a).not.toContain('Final_Answer');
    expect(a).not.toContain('approved answer');
  });
});
