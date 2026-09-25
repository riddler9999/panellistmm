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
  it('creates a complete signed URL without answer content', () => {
    const url = createOrReuseAnswerViewerUrl(base);
    expect(url).toMatch(/^https:\/\/viewer\.example\.com\/answer\//);
    expect(url).not.toContain('Final_Answer');
    expect(url).not.toContain('approved answer');
  });

  it('reuses an existing viewer URL idempotently across retries', () => {
    const existing = createOrReuseAnswerViewerUrl(base);
    const retried = createOrReuseAnswerViewerUrl({ ...base, now: 2000, existingUrl: existing });
    expect(retried).toBe(existing);
  });

  it('does not reuse unrelated or malformed existing URLs', () => {
    const generated = createOrReuseAnswerViewerUrl({ ...base, existingUrl: 'https://evil.example/answer/token' });
    expect(generated).toMatch(/^https:\/\/viewer\.example\.com\/answer\//);
    expect(generated).not.toContain('evil.example');
  });
});
