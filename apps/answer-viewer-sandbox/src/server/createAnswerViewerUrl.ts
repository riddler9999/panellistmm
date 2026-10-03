import { createHash } from 'node:crypto';
import { createViewerToken, verifyViewerToken } from './viewerToken';

function readExistingToken(existingUrl: string, expectedBase: URL): string | null {
  try {
    const existing = new URL(existingUrl);
    if (existing.origin !== expectedBase.origin || existing.pathname !== '/answer') return null;
    const params = new URLSearchParams(existing.hash.replace(/^#/, ''));
    return params.get('access');
  } catch {
    return null;
  }
}

export function createOrReuseAnswerViewerUrl(args: {
  ticketId: string;
  baseUrl: string;
  now: number;
  ttlSeconds: number;
  secret: string;
  existingUrl?: string | null;
}): string {
  const normalizedBase = args.baseUrl.replace(/\/$/, '');
  const base = new URL(normalizedBase);

  if (args.existingUrl) {
    const existingToken = readExistingToken(args.existingUrl, base);
    if (existingToken) {
      const claims = verifyViewerToken({ token: existingToken, now: args.now, secret: args.secret });
      if (claims?.ticketId === args.ticketId) return args.existingUrl;
    }
  }

  const nonce = createHash('sha256')
    .update(`viewer-v1:${args.ticketId}:${args.now}:${args.ttlSeconds}`)
    .digest('base64url')
    .slice(0, 22);
  const token = createViewerToken({ ...args, nonce });
  return `${normalizedBase}/answer#access=${encodeURIComponent(token)}`;
}
