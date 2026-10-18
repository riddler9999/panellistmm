import { authenticatedPrincipal, clearSessionCookie, revokeSession } from '../src/server/passcodeAuth.js';
type Req = {method?:string;headers:Record<string,string|string[]|undefined>};
type Res = {status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method==='POST'){
  const origin=req.headers.origin,host=req.headers.host;
  if(typeof origin!=='string'||typeof host!=='string'||!/^https:\/\//.test(origin)||new URL(origin).host!==host) return res.status(403).json({error:'invalid_origin'});
  try {await revokeSession(req.headers);res.setHeader('Set-Cookie',clearSessionCookie());return res.status(200).json({ok:true});}
  catch{return res.status(503).json({error:'auth_unavailable'});}
 }
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 try {const principal=await authenticatedPrincipal(req.headers);return principal?res.status(200).json(principal):res.status(401).json({error:'unauthenticated'});}
 catch{return res.status(503).json({error:'auth_unavailable'});}
}
