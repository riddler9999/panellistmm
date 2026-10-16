import { timingSafeEqual } from 'node:crypto';
import { readTickets, readProofs, readProof } from '../src/server/pocketHrData.js';
import { readConversations, readConversation, saveConversation, syncReply, withTicketLock, shouldAutoClose } from '../src/server/conversationLifecycle.js';
export const config = { maxDuration: 60 };
type Req = {method?:string;headers:Record<string,string|string[]|undefined>};
type Res = {status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const actual=req.headers.authorization, expected='Bearer '+process.env.CRON_SECRET;
 if(!process.env.CRON_SECRET||typeof actual!=='string'||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(actual),Buffer.from(expected))) return res.status(403).json({error:'access_denied'});
 let failures=0;
 try {
  const rows=await readTickets();
  const states=await readConversations(rows.map(row=>String(row['Row ID'])));
  const approvedIds=rows.filter(row=>['Approved','Delivered'].includes(String(row.Ticket_Status))).map(row=>String(row['Row ID']));
  const proofs=new Map< string, Awaited<ReturnType<typeof readProof>>>();
  for(let i=0;i<approvedIds.length;i+=200) for(const [id,proof] of await readProofs(approvedIds.slice(i,i+200))) proofs.set(id,proof);
  const candidates=rows.filter(row=>{
   const id=String(row['Row ID']); const state=states.get(id);
   return !state?.closed_at && (state?.pending_sync || (approvedIds.includes(id) && shouldAutoClose(proofs.get(id)?.delivery?.deliveredAt)));
  });
  for(const row of candidates) {
   try { await withTicketLock(String(row['Row ID']),async()=>{
    const id=String(row['Row ID']);
    const state=await readConversation(id);
    if(state?.closed_at) return;
    if(state?.pending_sync) {await syncReply(state);return;}
    // Re-read under the same lock used by approvals and replies.
    const current=(await readTickets()).find(ticket=>ticket['Row ID']===id);
    if(!current || !['Approved','Delivered'].includes(String(current.Ticket_Status))) return;
    const proof=await readProof(id);
    if(!proof.approval || proof.delivery?.result!=='success'||proof.delivery.revision!==proof.approval.revision || (state?.reply_revision??0)>=proof.approval.revision || !shouldAutoClose(proof.delivery.deliveredAt)) return;
    await saveConversation({...state,request_id:id,original_request:state?.original_request??String(current.Request_Text??''),entries:state?.entries??[],reply_revision:state?.reply_revision??0,pending_sync:false,closed_at:new Date().toISOString(),close_reason:'timeout'});
   }); } catch { failures++; }
  }
  return res.status(failures?503:200).json({ok:failures===0,failures});
 } catch { return res.status(503).json({error:'maintenance_unavailable'}); }
}
