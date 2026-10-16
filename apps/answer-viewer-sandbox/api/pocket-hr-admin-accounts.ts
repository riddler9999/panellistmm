import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { writePasscodeAccount, writeAccountName } from '../src/server/pocketHrData.js';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};

export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 const origin=req.headers.origin,host=req.headers.host;
 if(typeof origin!=='string'||typeof host!=='string'||!origin.startsWith('https://')||
    (()=>{try{return new URL(origin).host!==host;}catch{return true;}})())
    return res.status(403).json({error:'access_denied'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(principal?.role!=='Admin') return res.status(403).json({error:'access_denied'});
  const b=req.body && typeof req.body==='object'?req.body as Record<string,unknown>:{};
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const action=b.action;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||
    !['create','reset','disable','set_name'].includes(String(action)))
   return res.status(400).json({error:'invalid_input'});
  if(action==='set_name'){
   if(typeof b.name!=='string'||!b.name.trim()||b.name.length>120)return res.status(400).json({error:'invalid_name'});
   await writeAccountName(email,b.name);return res.status(200).json({ok:true});
  }
  if(action==='disable' && email===principal.email)
   return res.status(409).json({error:'cannot_disable_self'});
  if(action==='create' && !['Admin','User'].includes(String(b.role)))
   return res.status(400).json({error:'invalid_role'});
  if(action!=='disable' && (typeof b.passcode!=='string'||!/^\d{4}$/.test(b.passcode)))
   return res.status(400).json({error:'invalid_input'});
  await writePasscodeAccount(action as 'create'|'reset'|'disable',email,
    typeof b.passcode==='string'?b.passcode:undefined,
    typeof b.role==='string'?b.role:undefined);
  return res.status(action==='create'?201:200).json({ok:true,email});
 } catch(e) {
  const code=e instanceof Error?e.message:'';
  if(['pin_collision','duplicate_account','account_exists'].includes(code))
   return res.status(409).json({error:code});
  if(code==='account_not_found') return res.status(404).json({error:code});
  return res.status(503).json({error:'account_management_unavailable'});
 }
}
