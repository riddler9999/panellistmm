export const config = { maxDuration: 60 };
import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { validateConsultantAction } from '../src/server/consultantActions.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 const origin=req.headers.origin,host=req.headers.host;
 if(typeof origin!=='string'||typeof host!=='string'||(()=>{try{return new URL(origin).protocol!=='https:'||new URL(origin).host!==host;}catch{return true;}})())
  return res.status(403).json({error:'access_denied'});
 try{
  const principal=await authenticatedPrincipal(req.headers);
  if(!principal || principal.role==='User')return res.status(403).json({error:'access_denied'});
  const input=validateConsultantAction(req.body);
  if(!input||input.action==='approve')return res.status(400).json({error:'invalid_action'});
  // Approval must use the revision-safe Supabase approval endpoint. The former
  // Sheet-only edit/clarification/reject writes are not a supported state store.
  if(input.action==='reject') return res.status(409).json({error:'review_action_not_supported'});
  return res.status(409).json({error:'review_action_requires_approval'});
 }catch{return res.status(503).json({error:'consultant_action_unavailable'});}
}
