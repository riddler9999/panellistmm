import { authenticatedSession, parseSessionCookie } from '../src/server/pocketHrAuth';
type Req = { method?: string; headers: Record<string,string | string[] | undefined> };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
  try {
    const raw=req.headers.cookie;
    const principal=await authenticatedSession(parseSessionCookie(typeof raw==='string'?raw:undefined));
    if(!principal) return res.status(403).json({error:'access_denied'});
    return res.status(200).json({email:principal.email,role:principal.role});
  } catch { return res.status(503).json({error:'authentication_unavailable'}); }
}
