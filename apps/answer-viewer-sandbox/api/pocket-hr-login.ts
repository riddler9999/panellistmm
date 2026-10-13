import { authenticatePin, sessionCookie } from '../src/server/pocketHrAuth';
type Req = { method?: string; headers: Record<string, string | string[] | undefined>; body?: unknown };
type Res = { status(n: number): Res; setHeader(k: string,v: string): void; json(v: unknown): void };
export default async function handler(req: Req, res: Res) {
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
  const origin = req.headers.origin;
  // The bearer token must come from a Supabase-authenticated, email-confirmed user.
  // CORS is not enabled; browser clients must use the same-origin API.
  if (Array.isArray(origin)) return res.status(403).json({error:'access_denied'});
  const auth = req.headers.authorization;
  const bearer = typeof auth === 'string' && auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const body = req.body as { pin?: unknown } | undefined;
  try {
    const token = await authenticatePin(bearer, body?.pin);
    if (!token) return res.status(403).json({error:'access_denied'});
    res.setHeader('Set-Cookie',sessionCookie(token));
    return res.status(200).json({ok:true});
  } catch { return res.status(503).json({error:'authentication_unavailable'}); }
}
