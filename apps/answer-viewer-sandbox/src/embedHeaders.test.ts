import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('embed headers', () => {
  it('scopes iframe policy to answer routes', () => {
    const config = JSON.parse(readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'));
    const rule = config.headers.find((entry: { source: string }) => entry.source === '/answer/(.*)');
    expect(rule).toBeTruthy();
    const headers = Object.fromEntries(
      rule.headers.map((header: { key: string; value: string }) => [header.key.toLowerCase(), header.value]),
    );
    expect(headers['content-security-policy']).toContain('frame-ancestors https:');
    expect(headers['x-frame-options']).toBeUndefined();
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('no-referrer');
  });
});
