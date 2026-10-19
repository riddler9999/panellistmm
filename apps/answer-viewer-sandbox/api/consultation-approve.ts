import { encodeResponse, validateOptions } from '../src/domain/reviewedResponse.js';
import { selectAttachments } from '../src/server/responseAttachments.js';
import { draftVersion } from '../src/server/draftVersion.js';
import { readConversation, withTicketLock } from '../src/server/conversationLifecycle.js';
export const config = { maxDuration: 60 };
import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { validateConsultantAction } from '../src/server/consultantActions.js';
import { db, readProof, readTickets, acknowledgeDelivery, writeTicketPublication } from '../src/server/pocketHrData.js';
import { approvalIsCurrent } from '../src/server/atomicReview.js';

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
  const result=(status:number)=>({json:(body:unknown)=>({status,body})});
  const outcome = await withTicketLock(input.requestId,async()=>{
  const conversation=await readConversation(input.requestId);
  if(conversation?.closed_at || conversation?.pending_sync) return result(409).json({error:'ticket_closed_or_syncing'});
  const rows=await readTickets();
  const ticket=rows.find(row=>String(row['Row ID']).trim()===input.requestId);
  if(!ticket) return result(404).json({error:'ticket_not_found'});
  if((req.body as {draftVersion?:unknown}).draftVersion!==draftVersion(ticket)) return result(409).json({error:'draft_changed'});
  if(['resolved','closed'].includes(String(ticket.Ticket_Status).trim().toLowerCase()))
    return result(409).json({error:'request_already_final'});
  const proof=await readProof(input.requestId);
  if(['Approved','Delivered'].includes(String(ticket.Ticket_Status)))
    return result(409).json({error:'response_already_approved'});
  const body=req.body as {options?:unknown;attachmentIds?:unknown};
  const options=validateOptions(body.options);
  if(!options)return result(400).json({error:'invalid_options'});
  let attachments;
  try {attachments=await selectAttachments(input.requestId,body.attachmentIds);}catch{return result(400).json({error:'invalid_attachments'});}
  const content=encodeResponse({text:input.content!,options,attachments});
  if(content.length>50000)return result(400).json({error:'response_too_long'});
  const pending = proof.approval && (conversation?.reply_revision??0)<proof.approval.revision ? proof.approval : null;
  if(pending && (pending.approvedContent!==content || pending.revision!==input.expectedRevision+1 || pending.approvedByEmail!==principal.email)) return result(409).json({error:'response_already_approved'});
  let revision:number;
  try {
   revision=pending?.revision ?? await db<number>('rpc/pocket_hr_approve_snapshot','POST',{
    p_request_id:input.requestId,p_expected_revision:input.expectedRevision,
    p_content:content,p_approved_by_email:principal.email
   });
  } catch(e) {
   if(e instanceof Error && e.message==='storage_request_failed' && (e as Error & {status?:number}).status===400)
      return result(409).json({error:'revision_conflict'});
   throw e;
  }
  if(!approvalIsCurrent(revision,input.expectedRevision,conversation?.reply_revision??0))
    return result(409).json({error:'revision_conflict'});
  // Publication is a multi-system operation; do not acknowledge before Sheet writes succeed.
  await writeTicketPublication(input.requestId,{C:'Delivery Pending',Y:'Delivery Pending'});
  await writeTicketPublication(input.requestId,{H:input.content!});
  await writeTicketPublication(input.requestId,{C:'Approved',Y:'Approved'});
  if(!await acknowledgeDelivery(input.requestId,revision))
    return result(503).json({error:'delivery_ack_pending',revision});
  return result(200).json({ok:true,revision,state:'published'});
  });
  return res.status(outcome.status).json(outcome.body);
 } catch {
  return res.status(503).json({error:'approval_unavailable'});
 }
}
