import { parseSessionCookie, revokeSession, sessionCookie } from '../src/server/pocketHrAuth';
type Req = { method?:string; headers:Record<string,string|string[]|undefined> };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
  const origin=req.headers.origin,host=req.headers.host;
  if(typeof origin!=='string'||typeof host!=='string') return res.status(403).json({error:'access_denied'});
  try { if(new URL(origin).host!==host) return res.status(403).json({error:'access_denied'}); }
  catch { return res.status(403).json({error:'access_denied'}); }
  const cookie=req.headers.cookie;
  try { await revokeSession(parseSessionCookie(typeof cookie==='string'?cookie:undefined)); }
  catch { return res.status(503).json({error:'authentication_unavailable'}); }
  res.setHeader('Set-Cookie',sessionCookie('',true));
  return res.status(200).json({ok:true});
}
