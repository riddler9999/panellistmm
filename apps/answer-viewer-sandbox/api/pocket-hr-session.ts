import { authenticatedPrincipal, clearSessionCookie, revokeSession } from '../src/server/passcodeAuth';
type Req = {method?:string;headers:Record<string,string|string[]|undefined>};
type Res = {status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method==='POST'){
  try {await revokeSession(req.headers);res.setHeader('Set-Cookie',clearSessionCookie());return res.status(200).json({ok:true});}
  catch{return res.status(503).json({error:'auth_unavailable'});}
 }
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 try {const principal=await authenticatedPrincipal(req.headers);return principal?res.status(200).json(principal):res.status(401).json({error:'unauthenticated'});}
 catch{return res.status(503).json({error:'auth_unavailable'});}
}
