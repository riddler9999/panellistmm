import { decodeResponse } from '../src/domain/reviewedResponse.js';
import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { db, readProof } from '../src/server/pocketHrData.js';
import { releasedAnswer } from '../src/server/deliveryPolicy.js';
import { readConversation, saveConversation, syncReply, withTicketLock, shouldAutoClose } from '../src/server/conversationLifecycle.js';
export const config = { maxDuration: 60 };
type Req = { method?: string; headers: Record<string,string|string[]|undefined>; body?: unknown };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 if(req.method !== 'POST') return res.status(405).json({error:'method_not_allowed'});
 const origin=req.headers.origin, host=req.headers.host;
 try { if(typeof origin!=='string'||typeof host!=='string'||new URL(origin).origin !== 'https://'+host) return res.status(403).json({error:'access_denied'}); }
 catch { return res.status(403).json({error:'access_denied'}); }
 try {
  const identity=await authenticatedPrincipal(req.headers);
  if(!identity) return res.status(403).json({error:'access_denied'});
  const principal={...identity,role:'User' as const};
  const input=req.body as {requestId?:unknown;action?:unknown;content?:unknown;expectedRevision?:unknown}|undefined;
  if(!input || typeof input.requestId!=='string' || !input.requestId.trim() || input.requestId.length>256 || !['reply','close'].includes(String(input.action))) return res.status(400).json({error:'invalid_action'});
  if(input.action==='reply' && (typeof input.content!=='string'||!input.content.trim()||input.content.length>10000||!Number.isSafeInteger(input.expectedRevision))) return res.status(400).json({error:'invalid_reply'});
  const result=(status:number)=>({json:(body:unknown)=>({status,body})});
  const outcome = await withTicketLock(input.requestId,async()=>{
   const requests=await db<Array<{request_id:string;owner_account_id:string}>>(
    'pocket_hr_requests?select=request_id,owner_account_id&request_id=eq.'+encodeURIComponent(input.requestId)+'&limit=2'
   );
   if(requests.length!==1 || requests[0].owner_account_id!==identity.accountId)
    return result(404).json({error:'ticket_not_found'});
   const stateFromDb=await readConversation(input.requestId);
   if(!stateFromDb) return result(503).json({error:'conversation_unavailable'});
   let state=stateFromDb;
   if(state.closed_at) return result(409).json({error:'ticket_closed'});
   const ticket={'Row ID':input.requestId,Owner_Email:identity.email};
   if(input.action==='close') {
    await saveConversation({...state,closed_at:new Date().toISOString(),close_reason:'user',pending_sync:false});
    return result(200).json({ok:true});
   }
   // Identical retries resume the persisted Supabase turn and n8n dispatch without duplicating history.
   if(state.reply_revision===input.expectedRevision) {
    const last=state.entries.at(-1);
    if(last?.role!=='user'||last.content!==(input.content as string).trim()) return result(409).json({error:'revision_conflict'});
    if(state.pending_sync) await syncReply(state, identity.email);
    return result(200).json({ok:true});
   }
   const proof=await readProof(input.requestId as string);
   const answer=releasedAnswer(principal,ticket,proof.approval,proof.delivery);
   if(!answer || !proof.approval || proof.approval.revision!==input.expectedRevision || shouldAutoClose(proof.delivery?.deliveredAt)) return result(409).json({error:'reply_not_available'});
   const response=decodeResponse(answer);
   state={...state,reply_revision:proof.approval.revision,pending_sync:true,entries:[...state.entries,
    {role:'consultant',content:response.text,revision:proof.approval.revision,...(response.attachments.length?{attachments:response.attachments}:{}),...(response.options.length?{options:response.options}:{})},
    {role:'user',content:(input.content as string).trim(),revision:proof.approval.revision}]};
   await saveConversation(state);
   await syncReply(state, identity.email);
   return result(200).json({ok:true});
  });
  return res.status(outcome.status).json(outcome.body);
 } catch { return res.status(503).json({error:'conversation_unavailable'}); }
}
