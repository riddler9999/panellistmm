import { createHash, timingSafeEqual } from 'node:crypto';
import { db } from '../src/server/pocketHrData.js';
import { readConversation, withTicketLock } from '../src/server/conversationLifecycle.js';
import { storeRenderedPair } from '../src/server/responseAttachments.js';

export const config={maxDuration:60};
type Req={method?:string;headers:Record<string,string|string[]|undefined>;body?:unknown};
type Res={status(n:number):Res;setHeader(k:string,v:string):void;json(v:unknown):void};
function authorized(token:unknown):boolean {
  const secret=process.env.PANELLIST_RENDERER_UPLOAD_SECRET;
  if(typeof secret!=='string'||secret.length<32||typeof token!=='string'||!token)return false;
  const actual=createHash('sha256').update(token).digest();
  const expected=createHash('sha256').update(secret).digest();
  return timingSafeEqual(actual,expected);
}
export default async function handler(req:Req,res:Res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'method_not_allowed'});
 if(!authorized(req.headers['x-renderer-secret']))return res.status(403).json({error:'access_denied'});
 const input=req.body as {request_id?:unknown;files?:unknown}|undefined;
 const requestId=input?.request_id;
 if(typeof requestId!=='string'||!/^[A-Za-z0-9_-]{1,96}$/.test(requestId)||!Array.isArray(input?.files)||
    input.files.length!==2||input.files.some(f=>!f||typeof f.name!=='string'||typeof f.base64!=='string'))
   return res.status(400).json({error:'invalid_payload'});
 try{
   const outcome=await withTicketLock(requestId,async()=>{
     const requests=await db<Array<{request_id:string}>>('pocket_hr_requests?select=request_id&request_id=eq.'+encodeURIComponent(requestId)+'&limit=2');
     if(requests.length!==1)return {status:404,body:{error:'ticket_not_found'}};
     const state=await readConversation(requestId);
     if(state?.closed_at)return {status:409,body:{error:'ticket_closed'}};
     const files=await storeRenderedPair(requestId,input.files as Array<{name:string;base64:string}>);
     return {status:201,body:{ok:true,request_id:requestId,files}};
   });
   return res.status(outcome.status).json(outcome.body);
 }catch{return res.status(503).json({error:'renderer_storage_failed'});}
}
