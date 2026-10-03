import { describe, expect, it } from 'vitest';
import { createViewerToken, verifyViewerToken } from './viewerToken';

const secret = 'test-secret-value-that-is-long-enough';

describe('viewer token', () => {
  it('round-trips a valid token without embedding HR content', () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1_700_000_000, ttlSeconds: 3600, secret, nonce: 'nonce-1' });
    expect(token).not.toContain('final answer');
    expect(verifyViewerToken({ token, now: 1_700_000_100, secret })).toMatchObject({
      ticketId: 'ticket-123',
      issuedAt: 1_700_000_000,
      expiresAt: 1_700_003_600,
      nonce: 'nonce-1',
    });
  });

  it('rejects tampering, wrong secrets, malformed tokens, and expiry', () => {
    const token = createViewerToken({ ticketId: 'ticket-123', now: 1_700_000_000, ttlSeconds: 60, secret, nonce: 'nonce-1' });
    const tampered = token.slice(0, -1) + (token.endsWith('a') ? 'b' : 'a');
    expect(verifyViewerToken({ token: tampered, now: 1_700_000_010, secret })).toBeNull();
    expect(verifyViewerToken({ token, now: 1_700_000_010, secret: 'wrong-secret' })).toBeNull();
    expect(verifyViewerToken({ token: 'garbage', now: 1_700_000_010, secret })).toBeNull();
    expect(verifyViewerToken({ token, now: 1_700_000_060, secret })).toBeNull();
    expect(verifyViewerToken({ token, now: 1_700_000_061, secret })).toBeNull();
  });
});
