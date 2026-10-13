import { describe, expect, it } from 'vitest';
import { hashPin, isValidPin, newSessionToken, SESSION_LIFETIME_MS, sessionTokenDigest, verifyPin } from './pinSecurity';

describe('four-digit PIN primitives', () => {
  it('accepts exactly four ASCII digits including leading zeros', () => {
    expect(isValidPin('0007')).toBe(true);
    for (const invalid of ['123', '12345', '12a4', '１２３４', 1234, null]) expect(isValidPin(invalid)).toBe(false);
  });

  it('uses salted hashes and a required server-side pepper', async () => {
    const first = await hashPin('0007', 'test-only-pepper');
    const second = await hashPin('0007', 'test-only-pepper');
    expect(first).not.toBe(second);
    expect(first).not.toContain('0007');
    expect(await verifyPin('0007', first, 'test-only-pepper')).toBe(true);
    expect(await verifyPin('0008', first, 'test-only-pepper')).toBe(false);
    expect(await verifyPin('0007', first, 'wrong-pepper')).toBe(false);
    expect(await verifyPin('0007', 'malformed', 'test-only-pepper')).toBe(false);
    await expect(hashPin('0007', '')).rejects.toThrow();
  });

  it('creates opaque session tokens and stable server-side digests', () => {
    const token = newSessionToken();
    expect(token).not.toBe(newSessionToken());
    expect(sessionTokenDigest(token)).toBe(sessionTokenDigest(token));
    expect(sessionTokenDigest(token)).not.toBe(token);
    expect(SESSION_LIFETIME_MS).toBe(2_592_000_000);
  });
});
