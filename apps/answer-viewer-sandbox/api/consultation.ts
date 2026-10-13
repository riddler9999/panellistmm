import { resolvePrincipal, projectTicketList } from '../src/server/consultationAccess';
import type { TicketRow } from '../src/server/ticketRow';

type RequestLike = { method?: string; headers: Record<string, string | string[] | undefined> };
type ResponseLike = { status(code: number): ResponseLike; setHeader(name: string, value: string): void; json(body: unknown): void };

// Security gate: no verified Glide session adapter is configured yet. Never trust URL email or role.
export default async function handler(req: RequestLike, res: ResponseLike) {
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') return res.status(405).json({ error: 'method_not_allowed' });
  const identity: { email?: string; verified: boolean } = { verified: false };
  const users: Array<{ email: string; role: string }> = [];
  const principal = resolvePrincipal(identity, users);
  if (!principal) return res.status(403).json({ error: 'access_denied' });
  // Remains unreachable until independently verified session + trusted Sheet source are wired.
  const rows: TicketRow[] = [];
  return res.status(200).json({ role: principal.role, tickets: projectTicketList(principal, rows) });
}
