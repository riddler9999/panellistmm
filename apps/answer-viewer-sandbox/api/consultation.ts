import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { loadLiveConsultations } from '../src/server/liveConsultation.js';
type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(!principal) return res.status(403).json({error:'access_denied'});
  const tickets=await loadLiveConsultations(principal);
  return res.status(200).json({role:principal.role,tickets});
 } catch { return res.status(503).json({error:'consultation_unavailable'}); }
}
