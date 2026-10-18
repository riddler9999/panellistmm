import { authenticatedPrincipal } from '../src/server/passcodeAuth.js';
import { createSheetRequest } from '../src/server/pocketHrData.js';
import { saveConversation, syncReply, type ConversationState } from '../src/server/conversationLifecycle.js';
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
  if(!principal || principal.role !== 'User')return res.status(403).json({error:'access_denied'});
  const body=req.body && typeof req.body==='object'?req.body as Record<string,unknown>:{};
  const title=typeof body.title==='string'?body.title.trim():'';
  const category=typeof body.category==='string'?body.category.trim():'';
  const description=typeof body.description==='string'?body.description.trim():'';
  if(!title||title.length>160||category.length>80||!description||description.length>10000)
   return res.status(400).json({error:'invalid_request'});
  const requestId=await createSheetRequest(principal.email,title,category,description);
  const state:ConversationState={request_id:requestId,original_request:description,entries:[],closed_at:null,close_reason:null,reply_revision:0,pending_sync:true};
  await saveConversation(state);
  let dispatchPending=false;
  try{await syncReply(state);}catch{dispatchPending=true;}
  return res.status(201).json({ok:true,requestId,dispatchPending});
 }catch{return res.status(503).json({error:'request_creation_unavailable'});}
}
