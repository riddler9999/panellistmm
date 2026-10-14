import { loadLiveConsultations } from '../src/server/liveConsultation';

type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };

/** Identity must be independently verified server-side before enabling this endpoint.
 * Glide iframe URL, email, Row ID, and caller-supplied headers are NOT identities.
 */
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','private, no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if (req.method !== 'GET') return res.status(405).json({error:'method_not_allowed'});
  // Security gate: do not wire an untrusted identity into loadLiveConsultations.
  // Once a verifiable server-side identity bridge exists, resolve its principal
  // from a trusted role registry and invoke loadLiveConsultations(principal).
  void loadLiveConsultations;
  return res.status(403).json({error:'access_denied'});
}
