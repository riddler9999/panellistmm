import { draftVersion } from '../src/server/draftVersion.js';
import { readConversation, withTicketLock } from '../src/server/conversationLifecycle.js';
export const config = { maxDuration: 60 };
import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { validateConsultantAction } from '../src/server/consultantActions.js';
import { readTickets, readProof, updateSheetRequest } from '../src/server/pocketHrData.js';
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
  if(principal?.role!=='Admin')return res.status(403).json({error:'access_denied'});
  const input=validateConsultantAction(req.body);
  if(!input||input.action==='approve')return res.status(400).json({error:'invalid_action'});
  const result=(status:number)=>({json:(body:unknown)=>({status,body})});
  const outcome = await withTicketLock(input.requestId,async()=>{
  const conversation=await readConversation(input.requestId);
  if(conversation?.closed_at || conversation?.pending_sync) return result(409).json({error:'ticket_closed_or_syncing'});
  const ticket=(await readTickets()).find(row=>String(row['Row ID']).trim()===input.requestId);
  if(!ticket)return result(404).json({error:'ticket_not_found'});
  if((req.body as {draftVersion?:unknown}).draftVersion!==draftVersion(ticket)) return result(409).json({error:'draft_changed'});
  const proof=await readProof(input.requestId);
  const revision=proof.approval?.revision??0;
  if(revision>(conversation?.reply_revision??0)) return result(409).json({error:'response_already_approved'});
  if(revision!==input.expectedRevision)return result(409).json({error:'revision_conflict'});
  if(String(ticket.Ticket_Status).trim()==='Approved'||['Resolved','Closed'].includes(String(ticket.Ticket_Status).trim()))
   return result(409).json({error:'request_already_final'});
  const values:Record<string,string>=input.action==='edit'
   ?{Consultant_Answer:input.content!,Review_Status:'Draft'}
   :input.action==='request_clarification'
   ?{Clarification_Question:input.content!,Needs_Clarification:'Yes',Review_Status:'Draft',Ticket_Status:'Awaiting Review'}
   :{Review_Status:'Rejected',Ticket_Status:'Rejected'};
  await updateSheetRequest(input.requestId,values);
  return result(200).json({ok:true,state:input.action});
  });
  return res.status(outcome.status).json(outcome.body);
 }catch{return res.status(503).json({error:'consultant_action_unavailable'});}
}
