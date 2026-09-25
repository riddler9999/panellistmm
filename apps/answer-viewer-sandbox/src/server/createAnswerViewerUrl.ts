import { createHash } from 'node:crypto';
import { createViewerToken } from './viewerToken';

export function createAnswerViewerUrl(args: {
  ticketId: string;
  baseUrl: string;
  now: number;
  ttlSeconds: number;
  secret: string;
}): string {
  const normalizedBase = args.baseUrl.replace(/\/$/, '');
  const nonce = createHash('sha256')
    .update(`viewer-v1:${args.ticketId}:${args.now}:${args.ttlSeconds}`)
    .digest('base64url')
    .slice(0, 22);
  const token = createViewerToken({ ...args, nonce });
  return `${normalizedBase}/answer/${encodeURIComponent(token)}`;
}
