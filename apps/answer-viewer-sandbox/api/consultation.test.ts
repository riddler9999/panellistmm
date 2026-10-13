import { describe, expect, it } from 'vitest';
import handler from './consultation';

function mockResponse() {
  let code = 200;
  let body: unknown;
  const headers = new Map<string, string>();
  const response = {
    status(value: number) { code = value; return response; },
    setHeader(name: string, value: string) { headers.set(name.toLowerCase(), value); },
    json(value: unknown) { body = value; },
  };
  return { response, result: () => ({ code, body, headers }) };
}

describe('consultation API identity boundary', () => {
  it('fails closed even with a forged user email and role', async () => {
    const { response, result } = mockResponse();
    await handler({ method: 'GET', headers: { 'x-user-email': 'admin@example.com', 'x-user-role': 'Admin' } }, response);
    expect(result().code).toBe(403);
    expect(result().body).toEqual({ error: 'access_denied' });
    expect(result().headers.get('cache-control')).toContain('no-store');
  });

  it('rejects unsupported methods before attempting authentication', async () => {
    const { response, result } = mockResponse();
    await handler({ method: 'POST', headers: {} }, response);
    expect(result().code).toBe(405);
  });

  it('never treats a client-provided bearer token as verified identity', async () => {
    const { response, result } = mockResponse();
    await handler({ method: 'GET', headers: { authorization: 'Bearer untrusted' } }, response);
    expect(result().code).toBe(403);
  });
});
