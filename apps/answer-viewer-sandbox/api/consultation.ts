type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };

/** Identity must be independently verified server-side before enabling this endpoint.
 * Glide iframe URL, email, Row ID, and caller-supplied headers are NOT identities.
 */
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  // Security gate: a trusted principal must be established before calling the server-side live loader.
  return res.status(403).json({error:'access_denied'});
}
