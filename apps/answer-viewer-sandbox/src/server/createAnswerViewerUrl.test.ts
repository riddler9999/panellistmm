import { describe, expect, it } from 'vitest';
import { createOrReuseAnswerViewerUrl } from './createAnswerViewerUrl';

const base = {
  ticketId: 'ticket-123',
  baseUrl: 'https://viewer.example.com',
  now: 1000,
  ttlSeconds: 3600,
  secret: 'test-secret-value-that-is-long-enough',
};

describe('createOrReuseAnswerViewerUrl', () => {
  it('keeps the signed token in the URL fragment so it is not sent in HTTP request paths', () => {
    const url = createOrReuseAnswerViewerUrl(base);
    expect(url).toMatch(/^https:\/\/viewer\.example\.com\/answer#access=/);
    expect(new URL(url).pathname).toBe('/answer');
    expect(new URL(url).search).toBe('');
    expect(url).not.toContain('Final_Answer');
    expect(url).not.toContain('approved answer');
  });

  it('reuses an existing valid unexpired URL for the same ticket', () => {
    const existing = createOrReuseAnswerViewerUrl(base);
    const retried = createOrReuseAnswerViewerUrl({ ...base, now: 2000, existingUrl: existing });
    expect(retried).toBe(existing);
  });

  it('rotates expired links rather than preserving stale access', () => {
    const existing = createOrReuseAnswerViewerUrl({ ...base, ttlSeconds: 10 });
    const retried = createOrReuseAnswerViewerUrl({ ...base, now: 1010, ttlSeconds: 3600, existingUrl: existing });
    expect(retried).not.toBe(existing);
  });

  it('does not reuse unrelated, wrong-ticket, or malformed existing URLs', () => {
    const wrongTicket = createOrReuseAnswerViewerUrl({ ...base, ticketId: 'ticket-other' });
    expect(createOrReuseAnswerViewerUrl({ ...base, existingUrl: wrongTicket })).not.toBe(wrongTicket);
    const generated = createOrReuseAnswerViewerUrl({ ...base, existingUrl: 'https://evil.example/answer#access=token' });
    expect(generated).toMatch(/^https:\/\/viewer\.example\.com\/answer#access=/);
    expect(generated).not.toContain('evil.example');
  });
});
