import { authenticatedSession,parseSessionCookie } from '../src/server/pocketHrAuth';
import { db,readTickets,readProof,acknowledgeDelivery } from '../src/server/pocketHrData';
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 const origin=req.headers.origin,host=req.headers.host;
 let sameOrigin=false;
 try {sameOrigin=typeof origin==='string'&&typeof host==='string'&&new URL(origin).host===host;} catch { /* malformed Origin is denied */ }
 if(!sameOrigin)return res.status(403).json({error:'origin_denied'});
 try {
  const raw=req.headers.cookie;
  const session=await authenticatedSession(parseSessionCookie(typeof raw==='string'?raw:undefined));
  if(!session||session.role!=='Admin')return res.status(403).json({error:'access_denied'});
  const input=req.body as {requestId?:unknown;revision?:unknown}|null;
  if(!input||typeof input.requestId!=='string'||!input.requestId.trim()||!Number.isSafeInteger(input.revision)||Number(input.revision)<1)return res.status(400).json({error:'invalid_request'});
  const requestId=input.requestId.trim(),revision=Number(input.revision);
  const rows=await readTickets(),ticket=rows.find(t=>String(t['Row ID']).trim()===requestId);
  if(!ticket)return res.status(404).json({error:'not_found'});
  const content=String(ticket.Final_Answer??'').trim();
  if(!content)return res.status(409).json({error:'no_final_answer'});
  const existing=await readProof(requestId);
  if(existing.approval) {
   if(existing.approval.revision!==revision||existing.approval.approvedContent!==content)return res.status(409).json({error:'revision_conflict'});
  } else {
   // The workbook has no authoritative version column; only the first revision is safe.
   if(revision!==1)return res.status(409).json({error:'revision_conflict'});
   try {await db('pocket_hr_approvals','POST',{request_id:requestId,revision,approved_content:content,approved_by_account_id:session.accountId});}
   catch(error){if((error as {status?:number}).status===409)return res.status(409).json({error:'concurrent_approval'});throw error;}
  }
  const saved=await acknowledgeDelivery(requestId,revision);
  if(!saved)return res.status(503).json({error:'delivery_pending_retry'});
  return res.status(200).json({requestId,revision,delivery:'success'});
 } catch {return res.status(503).json({error:'backend_unavailable'});}
}
