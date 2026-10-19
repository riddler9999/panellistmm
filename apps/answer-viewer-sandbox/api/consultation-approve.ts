import { encodeResponse, validateOptions } from '../src/domain/reviewedResponse.js';
import { selectAttachments } from '../src/server/responseAttachments.js';
import { draftVersion } from '../src/server/draftVersion.js';
import { readConversation, withTicketLock } from '../src/server/conversationLifecycle.js';
export const config = { maxDuration: 60 };
import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { validateConsultantAction } from '../src/server/consultantActions.js';
import { db, readProof } from '../src/server/pocketHrData.js';

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
  if(!principal || principal.role==='User') return res.status(403).json({error:'access_denied'});
  const input=validateConsultantAction(req.body);
  if(!input || input.action!=='approve') return res.status(400).json({error:'invalid_action'});
  const result=(status:number)=>({json:(body:unknown)=>({status,body})});
  const outcome = await withTicketLock(input.requestId,async()=>{
  const conversation=await readConversation(input.requestId);
  if(conversation?.closed_at || conversation?.pending_sync) return result(409).json({error:'ticket_closed_or_syncing'});
  const requests=await db<Array<{request_id:string;owner_account_id:string}>>(
   'pocket_hr_requests?select=request_id,owner_account_id&request_id=eq.'+encodeURIComponent(input.requestId)+'&limit=2'
  );
  if(requests.length!==1) return result(404).json({error:'ticket_not_found'});
  const drafts=await db<Array<{message_id:string;content:string;revision:number}>>(
   'pocket_hr_messages?select=message_id,content,revision&request_id=eq.'+encodeURIComponent(input.requestId)+'&sender=eq.agent&review_state=eq.pending_review&revision=eq.'+(input.expectedRevision+1)+'&limit=2'
  );
  if(drafts.length>1)return result(409).json({error:'draft_changed'});
  const messageDraft=drafts[0]??null;
  const userMessages=await db<Array<{content:string}>>(
   'pocket_hr_messages?select=content&request_id=eq.'+encodeURIComponent(input.requestId)+'&sender=eq.user&order=created_at.asc&limit=1'
  );
  const ticket={Request_Text:userMessages[0]?.content??'',Consultant_Answer:'',Clarification_Question:'',AI_Answer:'',Sheet_AI_Answer:'',Review_Status:''};
  const proof=await readProof(input.requestId);
  const body=req.body as {options?:unknown;attachmentIds?:unknown};
  const options=validateOptions(body.options);
  if(!options)return result(400).json({error:'invalid_options'});
  let attachments;
  try {attachments=await selectAttachments(input.requestId,body.attachmentIds);}catch{return result(400).json({error:'invalid_attachments'});}
  const content=encodeResponse({text:input.content!,options,attachments});
  if(content.length>50000)return result(400).json({error:'response_too_long'});
  const pending = proof.approval && (conversation?.reply_revision??0)<proof.approval.revision ? proof.approval : null;
  if(pending) {
   if(pending.approvedContent!==content || input.expectedRevision!==pending.revision-1)
    return result(409).json({error:'response_already_approved'});
  } else if((req.body as {draftVersion?:unknown}).draftVersion!==draftVersion(ticket,messageDraft?.content)) {
   return result(409).json({error:'draft_changed'});
  }
  let revision:number;
  try {
   revision=pending?.revision ?? (messageDraft
    ? await db<number>('rpc/pocket_hr_approve_message','POST',{
      p_message_id:messageDraft.message_id,p_expected_revision:input.expectedRevision,
      p_approved_content:content,p_approved_by_email:principal.email,
     })
    : await db<number>('rpc/pocket_hr_approve_snapshot','POST',{
      p_request_id:input.requestId,p_expected_revision:input.expectedRevision,
      p_content:content,p_approved_by_email:principal.email,
     }));
  } catch(e) {
   if(e instanceof Error && e.message==='storage_request_failed' && (e as Error & {status?:number}).status===400)
      return result(409).json({error:'revision_conflict'});
   throw e;
  }
  // The approval RPC creates a pending delivery. Only the delivery RPC releases it.
  try {
   const delivery=await db<string>('rpc/pocket_hr_record_delivery_result','POST',{
    p_request_id:input.requestId,p_revision:revision,p_success:true,p_error:null,
   });
   if(delivery!=='success') return result(503).json({error:'delivery_ack_pending',revision});
  } catch { return result(503).json({error:'delivery_ack_pending',revision}); }
  return result(200).json({ok:true,revision,state:'published'});
  });
  return res.status(outcome.status).json(outcome.body);
 } catch {
  return res.status(503).json({error:'approval_unavailable'});
 }
}
