import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { validateConsultantAction } from '../src/server/consultantActions.js';
import { db, readTickets, acknowledgeDelivery, writeTicketPublication } from '../src/server/pocketHrData.js';

type Req = {method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res = {status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};

/** A revision is committed before publication. Retrying identical approvals is idempotent. */
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 const origin=req.headers.origin;
 const host=req.headers.host;
 if(typeof origin!=='string'||typeof host!=='string'||!origin.startsWith('https://')||
    (()=>{try{return new URL(origin).host!==host;}catch{return true;}})())
   return res.status(403).json({error:'access_denied'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(principal?.role!=='Admin') return res.status(403).json({error:'access_denied'});
  const input=validateConsultantAction(req.body);
  if(!input || input.action!=='approve') return res.status(400).json({error:'invalid_action'});
  const rows=await readTickets();
  const ticket=rows.find(row=>String(row['Row ID']).trim()===input.requestId);
  if(!ticket) return res.status(404).json({error:'ticket_not_found'});
  const content=input.content!;
  let revision:number;
  try {
   revision=await db<number>('rpc/pocket_hr_approve_snapshot','POST',{
    p_request_id:input.requestId,p_expected_revision:input.expectedRevision,
    p_content:content,p_approved_by_email:principal.email
   });
  } catch(e) {
   if(e instanceof Error && e.message==='storage_request_failed' && (e as Error & {status?:number}).status===400)
      return res.status(409).json({error:'revision_conflict'});
   throw e;
  }
  // Sheet status is the only user-facing release condition. Keep it non-approved
  // until both the immutable snapshot and durable delivery acknowledgement exist.
  await writeTicketPublication(input.requestId,{C:'Delivery Pending',Y:'Delivery Pending'});
  await writeTicketPublication(input.requestId,{H:content});
  await writeTicketPublication(input.requestId,{C:'Approved',Y:'Approved'});
  if(!await acknowledgeDelivery(input.requestId,revision))
    return res.status(503).json({error:'delivery_ack_pending',revision});
  return res.status(200).json({ok:true,revision,state:'published'});
 } catch {
  return res.status(503).json({error:'approval_unavailable'});
 }
}
