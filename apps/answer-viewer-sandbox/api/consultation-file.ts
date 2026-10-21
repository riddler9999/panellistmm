import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { db } from '../src/server/pocketHrData.js';
import { readConversation,withTicketLock } from '../src/server/conversationLifecycle.js';
import { decodeResponse } from '../src/domain/reviewedResponse.js';
import { validateAttachment,storeAttachment,readAttachment,downloadAttachment } from '../src/server/responseAttachments.js';
export const config={maxDuration:60};
type Req={method?:string;headers:Record<string,string|string[]|undefined>;query?:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void;send(v:Buffer):void};
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method??''))return res.status(405).json({error:'method_not_allowed'});
 try {
  const principal=await authenticatedPrincipal(req.headers);
  if(!principal)return res.status(403).json({error:'access_denied'});
  if(req.method==='POST'){
   const origin=req.headers.origin;
   try{if(typeof origin!=='string'||new URL(origin).origin!=='https://'+req.headers.host)return res.status(403).json({error:'access_denied'});}catch{return res.status(403).json({error:'access_denied'});}
   if(principal.role==='User')return res.status(403).json({error:'access_denied'});
   const input=req.body as {requestId?:unknown;name?:unknown;base64?:unknown}|undefined;
   if(!input||typeof input.requestId!=='string'||!input.requestId||input.requestId.length>256)return res.status(400).json({error:'invalid_file'});
   const requestId=input.requestId;
   const result=(status:number)=>({json:(body:unknown)=>({status,body})});
  const outcome = await withTicketLock(requestId,async()=>{
    const requests=await db<Array<{request_id:string;owner_account_id:string}>>(
     'pocket_hr_requests?select=request_id,owner_account_id&request_id=eq.'+encodeURIComponent(requestId)+'&limit=2'
    );
    if(requests.length!==1 || (principal.role==='User' && requests[0].owner_account_id!==principal.accountId))
     return result(404).json({error:'ticket_not_found'});
    const state=await readConversation(requestId);
    if(state?.closed_at||state?.pending_sync)return result(409).json({error:'response_not_editable'});
    let file;try{file=await validateAttachment(input.name,input.base64);}catch{return result(400).json({error:'invalid_file'});}
    return result(201).json(await storeAttachment(requestId,principal.email,file));
   });
  return res.status(outcome.status).json(outcome.body);
  }
  const id=req.query?.id, revision=Number(req.query?.revision);
  if(typeof id!=='string'||!Number.isSafeInteger(revision)||revision<1)return res.status(404).json({error:'file_not_found'});
  const file=await readAttachment(id);
  if(!file)return res.status(404).json({error:'file_not_found'});
  const requests=await db<Array<{request_id:string;owner_account_id:string}>>(
   'pocket_hr_requests?select=request_id,owner_account_id&request_id=eq.'+encodeURIComponent(file.request_id)+'&limit=2'
  );
  if(requests.length!==1 || (principal.role==='User' && requests[0].owner_account_id!==principal.accountId))
   return res.status(404).json({error:'file_not_found'});
  const filter='request_id=eq.'+encodeURIComponent(file.request_id)+'&revision=eq.'+revision;
  const approvals=await db<Array<{approved_content:string}>>('pocket_hr_approvals?select=approved_content&'+filter);
  const deliveries=await db<Array<{result:string}>>('pocket_hr_deliveries?select=result&'+filter);
  if(deliveries[0]?.result!=='success'||!approvals[0]||!decodeResponse(approvals[0].approved_content).attachments.some(a=>a.id===id))return res.status(404).json({error:'file_not_found'});
  const bytes=await downloadAttachment(file);
  const inline=req.query?.inline==='1' && file.mime==='image/png';
  res.setHeader('Content-Security-Policy',"default-src 'none'; sandbox");
  res.setHeader('Content-Type',file.mime);
  res.setHeader('Content-Disposition',(inline?'inline':'attachment')+"; filename*=UTF-8''"+encodeURIComponent(file.name));
  return res.status(200).send(bytes);
 }catch{return res.status(503).json({error:'file_unavailable'});}
}
