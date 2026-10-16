import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { canAccessTicket } from '../src/server/consultationAccess.js';
import { readTickets, readProof } from '../src/server/pocketHrData.js';
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
  const principal=await authenticatedPrincipal(req.headers);
  if(principal?.role!=='User') return res.status(403).json({error:'access_denied'});
  const input=req.body as {requestId?:unknown;action?:unknown;content?:unknown;expectedRevision?:unknown}|undefined;
  if(!input || typeof input.requestId!=='string' || !input.requestId.trim() || input.requestId.length>256 || !['reply','close'].includes(String(input.action))) return res.status(400).json({error:'invalid_action'});
  if(input.action==='reply' && (typeof input.content!=='string'||!input.content.trim()||input.content.length>10000||!Number.isSafeInteger(input.expectedRevision))) return res.status(400).json({error:'invalid_reply'});
  return await withTicketLock(input.requestId,async()=>{
   const ticket=(await readTickets()).find(row=>row['Row ID']===input.requestId);
   if(!ticket || !canAccessTicket(principal,ticket)) return res.status(404).json({error:'ticket_not_found'});
   let state=await readConversation(input.requestId as string) ?? {request_id:input.requestId as string,original_request:String(ticket.Request_Text??''),entries:[],closed_at:null,close_reason:null,reply_revision:0,pending_sync:false};
   if(state.closed_at || ['Closed','Resolved'].includes(String(ticket.Ticket_Status))) return res.status(409).json({error:'ticket_closed'});
   if(input.action==='close') {
    await saveConversation({...state,closed_at:new Date().toISOString(),close_reason:'user',pending_sync:false});
    return res.status(200).json({ok:true});
   }
   // Identical retries repair the pending bridge write without adding another turn.
   if(state.reply_revision===input.expectedRevision) {
    const last=state.entries.at(-1);
    if(last?.role!=='user'||last.content!==(input.content as string).trim()) return res.status(409).json({error:'revision_conflict'});
    if(state.pending_sync) await syncReply(state);
    return res.status(200).json({ok:true});
   }
   const proof=await readProof(input.requestId as string);
   const answer=releasedAnswer(principal,ticket,proof.approval,proof.delivery);
   if(!answer || !proof.approval || proof.approval.revision!==input.expectedRevision || !['Approved','Delivered'].includes(String(ticket.Ticket_Status)) || shouldAutoClose(proof.delivery?.deliveredAt)) return res.status(409).json({error:'reply_not_available'});
   state={...state,reply_revision:proof.approval.revision,pending_sync:true,entries:[...state.entries,
    {role:'consultant',content:answer,revision:proof.approval.revision},
    {role:'user',content:(input.content as string).trim(),revision:proof.approval.revision}]};
   await saveConversation(state);
   await syncReply(state);
   return res.status(200).json({ok:true});
  });
 } catch { return res.status(503).json({error:'conversation_unavailable'}); }
}
