import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { db } from '../src/server/pocketHrData.js';
import { hasPendingAgentDraft, readConversation, saveConversation, type ConversationState } from '../src/server/conversationLifecycle.js';
import { dispatchUnifiedRequest } from '../src/server/unifiedDispatch.js';
export const config={maxDuration:60};
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
  if(!principal)return res.status(403).json({error:'access_denied'});
  const rawKey=req.headers['idempotency-key'];
  const idempotencyKey=Array.isArray(rawKey)?rawKey[0]:rawKey;
  if(typeof idempotencyKey!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey))
   return res.status(400).json({error:'idempotency_key_required'});
  const body=req.body && typeof req.body==='object'?req.body as Record<string,unknown>:{};
  const title=typeof body.title==='string'?body.title.trim():'';
  const category=typeof body.category==='string'?body.category.trim():'';
  const description=typeof body.description==='string'?body.description.trim():'';
  if(!title||title.length>160||category.length>80||!description||description.length>10000)
   return res.status(400).json({error:'invalid_request'});
  const requestId=idempotencyKey.toLowerCase();
  const state:ConversationState={request_id:requestId,original_request:description,entries:[],closed_at:null,close_reason:null,reply_revision:0,pending_sync:true};
  const created=await db<boolean>('rpc/pocket_hr_create_request', 'POST', {
   p_request_id:requestId,p_owner_account_id:principal.accountId,p_content:description,p_title:title,p_category:category,
  });
  // The transactional RPC has already committed the request, user message,
  // and retryable conversation state. Legacy Google Sheets is not required.
  let dispatchPending=false;
  const savedConversation=created?state:await readConversation(requestId);
  if(savedConversation?.pending_sync) {
   try {
    const revision=savedConversation.reply_revision+1;
    if(!await hasPendingAgentDraft(requestId,revision)) {
     await dispatchUnifiedRequest({
      requestId, revision,
      ownerEmail:principal.email, title, category,
      description:savedConversation.original_request,
     });
    }
    if(await hasPendingAgentDraft(requestId,revision))
     await saveConversation({...savedConversation,pending_sync:false});
    else dispatchPending=true;
   } catch(error) {
    // Preserve the committed request and pending_sync for a safe retry.
    console.error('pocket_hr_dispatch_pending', {code:error instanceof Error?error.message:'unknown'});
    dispatchPending=true;
   }
  }
  return res.status(created?201:200).json({ok:true,requestId,dispatchPending});
 }catch{return res.status(503).json({error:'request_creation_unavailable'});}
}
