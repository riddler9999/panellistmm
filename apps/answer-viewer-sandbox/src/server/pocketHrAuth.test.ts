import { afterEach, describe, expect, it, vi } from 'vitest';
import consultation from '../../api/consultation';
import approve from '../../api/consultation-approve';
import { createViewerToken } from './viewerToken';

afterEach(() => vi.unstubAllGlobals());

// These exercise real handlers: rejection evidence, not successful Glide authentication.
// Accepting a supplied identity or accessing private storage before verification fails the test.
const legacyToken = createViewerToken({
  ticketId: 'B-001', now: Math.floor(Date.now() / 1000), ttlSeconds: 60,
  secret: 'test-only-viewer-secret-not-a-glide-identity', nonce: 'test-nonce',
});
const attempts = [
  { name: 'no identity', headers: {}, body: {} },
  { name: 'URL email, Row ID and role', headers: {}, body: {},
    url: '/api/consultation?email=b%40example.com&rowId=B-001&role=Admin',
    query: { email: 'b@example.com', rowId: 'B-001', role: 'Admin' } },
  { name: 'client identity headers', headers: { 'x-user-email': 'b@example.com', 'x-user-role': 'Admin' }, body: {} },
  { name: 'client verified flag', headers: {}, body: { email: 'b@example.com', role: 'Admin', verified: true } },
  { name: 'Glide origin and referrer', headers: { origin: 'https://example.glide.page', referer: 'https://example.glide.page/' }, body: {} },
  { name: 'forged bearer token', headers: { authorization: 'Bearer forged' }, body: {} },
  { name: 'legacy signed ticket capability', headers: { authorization: `Bearer ${legacyToken}` }, body: {} },
  { name: 'legacy session cookie', headers: { cookie: 'pocket_hr_session=forged' }, body: {} },
];

describe.each([
  { method: 'GET', handler: consultation },
  { method: 'POST', handler: approve },
])('$method consultation identity boundary', ({ method, handler }) => {
  it.each(attempts)('rejects $name without private reads or writes', async attempt => {
    const fetch = vi.fn(() => { throw new Error('private storage must not be contacted'); });
    vi.stubGlobal('fetch', fetch);
    let status = 200;
    let body: unknown;
    const headers = new Map<string, string>();
    const response = {
      status(value: number) { status = value; return response; },
      setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
      json(value: unknown) { body = value; },
    };
    const request = {
      ...attempt, method,
      body: { requestId: 'B-001', action: 'approve', content: 'must not publish', expectedRevision: 0, ...attempt.body },
    };
    await handler(request, response);
    expect(status).toBe(403);
    expect(body).toEqual({ error: 'access_denied' });
    expect(headers.get('cache-control')).toBe('private, no-store');
    expect(fetch).not.toHaveBeenCalled();
  });
});
