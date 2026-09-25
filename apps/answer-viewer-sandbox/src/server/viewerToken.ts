import { createHmac, timingSafeEqual } from 'node:crypto';

type Claims = { v: 1; ticketId: string; issuedAt: number; expiresAt: number; nonce: string };
const encode = (value: string) => Buffer.from(value, 'utf8').toString('base64url');
const decode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

export function createViewerToken(args: { ticketId: string; now: number; ttlSeconds: number; secret: string; nonce: string }): string {
  const claims: Claims = { v: 1, ticketId: args.ticketId, issuedAt: args.now, expiresAt: args.now + args.ttlSeconds, nonce: args.nonce };
  const payload = encode(JSON.stringify(claims));
  const signature = createHmac('sha256', args.secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

export function verifyViewerToken(args: { token: string; now: number; secret: string }): Omit<Claims,'v'> | null {
  const [payload, signature, extra] = args.token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = createHmac('sha256', args.secret).update(payload).digest();
  let actual: Buffer;
  try { actual = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const parsed = JSON.parse(decode(payload)) as Partial<Claims>;
    if (parsed.v !== 1 || typeof parsed.ticketId !== 'string' || !parsed.ticketId ||
        typeof parsed.issuedAt !== 'number' || typeof parsed.expiresAt !== 'number' ||
        typeof parsed.nonce !== 'string' || !parsed.nonce || parsed.expiresAt <= args.now) return null;
    return { ticketId: parsed.ticketId, issuedAt: parsed.issuedAt, expiresAt: parsed.expiresAt, nonce: parsed.nonce };
  } catch {
    return null;
  }
}
