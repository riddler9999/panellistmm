import { randomUUID } from 'node:crypto';
import { authenticatedPrincipal, hashPasscode } from '../src/server/passcodeAuth';
import { db } from '../src/server/pocketHrData';

type Req = {method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res = {status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
type Account = {id:string;email:string;role:'Admin'|'User';disabled_at:string|null};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(principal?.role!=='Admin') return res.status(403).json({error:'access_denied'});
  const b=req.body && typeof req.body==='object'?req.body as Record<string,unknown>:{};
  const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
  const action=b.action;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['create','reset','disable'].includes(String(action))) return res.status(400).json({error:'invalid_input'});
  if(action!=='disable' && (typeof b.passcode!=='string'||!/^\d{4}$/.test(b.passcode))) return res.status(400).json({error:'invalid_input'});
  const existing=await db<Account[]>('pocket_hr_accounts?select=id,email,role,disabled_at&email=eq.'+encodeURIComponent(email)+'&limit=2');
  if(action==='create') {
   if(existing.length) return res.status(409).json({error:'account_exists'});
   if(b.role!=='User'&&b.role!=='Admin') return res.status(400).json({error:'invalid_role'});
   const inserted=await db<Account[]>('pocket_hr_accounts','POST',{
    identity_provider:'verified_admin_provisioning',external_subject:randomUUID(),
    email,role:b.role,pin_hash:hashPasscode(b.passcode as string),pin_set_at:new Date().toISOString()
   });
   return res.status(201).json({email:inserted[0]?.email,role:inserted[0]?.role});
  }
  if(existing.length!==1) return res.status(404).json({error:'account_not_found'});
  if(action==='disable') {
   if(existing[0].email===principal.email) return res.status(409).json({error:'cannot_disable_self'});
   await db('pocket_hr_accounts?id=eq.'+existing[0].id,'PATCH',{disabled_at:new Date().toISOString()});
  } else {
   await db('pocket_hr_accounts?id=eq.'+existing[0].id,'PATCH',{
    pin_hash:hashPasscode(b.passcode as string),pin_set_at:new Date().toISOString(),
    failed_attempts:0,locked_until:null,disabled_at:null
   });
  }
  // Reset and disable invalidate all existing sessions.
  await db('pocket_hr_sessions?account_id=eq.'+existing[0].id+'&revoked_at=is.null','PATCH',{revoked_at:new Date().toISOString()});
  return res.status(200).json({ok:true});
 } catch {return res.status(503).json({error:'admin_account_unavailable'});}
}
