import { authenticatedSession,parseSessionCookie } from '../src/server/pocketHrAuth';
import { projectConsultationTicket } from '../src/server/consultationAccess';
import { releasedAnswer } from '../src/server/deliveryPolicy';
import { readTickets,readProof } from '../src/server/pocketHrData';
type Req={method?:string;headers:Record<string,string|string[]|undefined>};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET')return res.status(405).json({error:'method_not_allowed'});
 try {
  const raw=req.headers.cookie;
  const session=await authenticatedSession(parseSessionCookie(typeof raw==='string'?raw:undefined));
  if(!session)return res.status(403).json({error:'access_denied'});
  const principal={email:session.email,role:session.role};
  const rows=await readTickets();
  const tickets=[];
  for(const row of rows) {
   const projected=projectConsultationTicket(principal,row);
   if(!projected)continue;
   // A current Sheet edit after approval is not independently revisioned.
   // Only release when the live content still equals the approved snapshot.
   const {approval,delivery}=await readProof(projected.ticketId);
   const unchanged=approval && typeof row.Final_Answer==='string' && row.Final_Answer.trim()===approval.approvedContent;
   const answer=unchanged?releasedAnswer(principal,row,approval,delivery):null;
   if(answer!==null)projected.finalAnswer=answer;
   tickets.push(projected);
  }
  return res.status(200).json({role:session.role,tickets});
 } catch {return res.status(503).json({error:'consultation_unavailable'});}
}
