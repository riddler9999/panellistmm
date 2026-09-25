import { createHash } from 'node:crypto';
import { createViewerToken } from './viewerToken';

export function createOrReuseAnswerViewerUrl(args: {
  ticketId: string;
  baseUrl: string;
  now: number;
  ttlSeconds: number;
  secret: string;
  existingUrl?: string | null;
}): string {
  const normalizedBase = args.baseUrl.replace(/\/$/, '');
  if (args.existingUrl) {
    try {
      const existing = new URL(args.existingUrl);
      const base = new URL(normalizedBase);
      if (existing.origin === base.origin && existing.pathname.startsWith('/answer/') && existing.pathname.length > '/answer/'.length) {
        return existing.toString();
      }
    } catch {
      // Invalid existing value falls through to safe regeneration.
    }
  }

  const nonce = createHash('sha256')
    .update(`viewer-v1:${args.ticketId}:${args.now}:${args.ttlSeconds}`)
    .digest('base64url')
    .slice(0, 22);
  const token = createViewerToken({ ...args, nonce });
  return `${normalizedBase}/answer/${encodeURIComponent(token)}`;
}
