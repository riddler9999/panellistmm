import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { db, readTickets } from '../src/server/pocketHrData.js';

type Req = { method?: string; headers: Record<string,string|string[]|undefined>; query?: Record<string,unknown> };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
type Message = {
 message_id:string; request_id:string; sender:'user'|'agent'|'consultant';
 content:string; review_state:'pending_review'|'approved'|null;
 approved_content:string|null; publication_revision:number|null; created_at:string;
};
type Approval = {request_id:string;revision:number;approved_content:string;approved_by_email:string|null;approved_at:string|null};
type Delivery = {request_id:string;revision:number;result:string;delivered_at:string|null};
const query = (value:string) => encodeURIComponent(value);

export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const requestId=req.query?.requestId;
 if(typeof requestId!=='string'||!requestId.trim()||requestId.length>256)
  return res.status(400).json({error:'invalid_request_id'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(!principal) return res.status(403).json({error:'access_denied'});
  // Legacy Sheet ownership is the current verified account-to-request binding.
  // Do not trust request owner or reviewer roles supplied by the browser.
  const tickets=await readTickets();
  const matches=tickets.filter(row=>String(row['Row ID']).trim()===requestId);
  if(matches.length!==1) return res.status(404).json({error:'request_not_found'});
  if(principal.role!=='Admin' && String(matches[0].Owner_Email).trim().toLowerCase()!==principal.email.toLowerCase())
   return res.status(404).json({error:'request_not_found'});
  const messages=await db<Message[]>('pocket_hr_messages?select=message_id,request_id,sender,content,review_state,approved_content,publication_revision,created_at&request_id=eq.'+query(requestId)+'&order=created_at.asc,message_id.asc&limit=500');
  if(principal.role==='Admin') return res.status(200).json({requestId,messages:messages.map(m=>({
   messageId:m.message_id,sender:m.sender,content:m.content,reviewState:m.review_state,
   approvedContent:m.approved_content,publicationRevision:m.publication_revision,createdAt:m.created_at
  }))});
  const sheetPublished=['Approved','Delivered','Resolved','Closed'].includes(String(matches[0].Ticket_Status??'').trim());
  const approved=messages.filter(m=>m.sender==='agent' && m.review_state==='approved' &&
    Number.isSafeInteger(m.publication_revision) && (m.publication_revision??0)>0);
  const revisions=[...new Set(approved.map(m=>m.publication_revision as number))];
  const released=new Set<number>();
  if(sheetPublished && revisions.length) {
   const [approvals,deliveries]=await Promise.all([
    db<Approval[]>('pocket_hr_approvals?select=request_id,revision,approved_content,approved_by_email,approved_at&request_id=eq.'+query(requestId)+'&revision=in.('+revisions.join(',')+')'),
    db<Delivery[]>('pocket_hr_deliveries?select=request_id,revision,result,delivered_at&request_id=eq.'+query(requestId)+'&revision=in.('+revisions.join(',')+')')
   ]);
   const approvedByRevision=new Map(approvals.map(a=>[a.revision,a]));
   const delivered=new Set(deliveries.filter(d=>d.request_id===requestId && d.result==='success' && !!d.delivered_at).map(d=>d.revision));
   for(const m of approved) {
    const a=approvedByRevision.get(m.publication_revision!);
    if(a?.request_id===requestId && a.approved_content===m.approved_content &&
       !!a.approved_at && !!a.approved_by_email && delivered.has(m.publication_revision!))
      released.add(m.publication_revision!);
   }
  }
  const visible=messages.filter(m=>m.sender==='user' ||
    (m.sender==='agent' && m.review_state==='approved' &&
     m.publication_revision!==null && released.has(m.publication_revision)));
  return res.status(200).json({requestId,messages:visible.map(m=>({
   messageId:m.message_id,sender:m.sender,
   content:m.sender==='user'?m.content:m.approved_content,createdAt:m.created_at
  }))});
 } catch {
  return res.status(503).json({error:'messages_unavailable'});
 }
}
