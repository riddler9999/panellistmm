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
  const ticket=(await readTickets()).find(row=>String(row['Row ID']).trim()===input.requestId);
  if(!ticket)return res.status(404).json({error:'ticket_not_found'});
  const proof=await readProof(input.requestId);
  const revision=proof.approval?.revision??0;
  if(revision!==input.expectedRevision)return res.status(409).json({error:'revision_conflict'});
  if(String(ticket.Ticket_Status).trim()==='Approved'||String(ticket.Ticket_Status).trim()==='Resolved')
   return res.status(409).json({error:'request_already_final'});
  const values:Record<string,string>=input.action==='edit'
   ?{Consultant_Answer:input.content!,Review_Status:'Draft'}
   :input.action==='request_clarification'
   ?{Clarification_Question:input.content!,Needs_Clarification:'Yes',Review_Status:'Clarification Requested',Ticket_Status:'Needs Clarification'}
   :{Review_Status:'Rejected',Ticket_Status:'Rejected'};
  await updateSheetRequest(input.requestId,values);
  return res.status(200).json({ok:true,state:input.action});
 }catch{return res.status(503).json({error:'consultant_action_unavailable'});}
}
