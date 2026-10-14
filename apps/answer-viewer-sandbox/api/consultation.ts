type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
/** Glide owns login. Until an independently verified server-side Glide identity bridge exists,
 * this endpoint must not expose private HR data or mutate approval/delivery records.
 * URL parameters, browser headers and Glide iframe context are not trusted identities. */
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  return res.status(403).json({error:'access_denied'});
}
