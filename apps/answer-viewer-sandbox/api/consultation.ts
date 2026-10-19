import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { loadLiveConsultations } from '../src/server/liveConsultation.js';
type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown; query?: Record<string,unknown> };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(!principal) return res.status(403).json({error:'access_denied'});
  const side=req.query?.side ?? 'user';
  if(side!=='user' && side!=='admin') return res.status(400).json({error:'invalid_side'});
  if(side==='admin' && principal.role==='User') return res.status(403).json({error:'access_denied'});
  const viewer=side==='admin' ? principal : {...principal,role:'User' as const};
  const tickets=await loadLiveConsultations(viewer);
  return res.status(200).json({role:viewer.role,tickets});
 } catch (error) {
  const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'unexpected_failure';
  console.error('pocket_hr_consultation_failed', { code });
  return res.status(503).json({error:'consultation_unavailable'});
 }
}
