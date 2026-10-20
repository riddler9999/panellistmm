import { timingSafeEqual } from 'node:crypto';
import { db, readProof } from '../src/server/pocketHrData.js';
import {
 hasPendingAgentDraft, readConversation, saveConversation, syncReply, withTicketLock, shouldAutoClose, AUTO_CLOSE_MS,
 type ConversationState,
} from '../src/server/conversationLifecycle.js';
import { dispatchUnifiedRequest } from '../src/server/unifiedDispatch.js';

export const config = { maxDuration: 60 };
type Req = { method?: string; headers: Record<string,string|string[]|undefined> };
type Res = { status(n:number): Res; setHeader(k:string,v:string):void; json(v:unknown):void };

export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='GET') return res.status(405).json({error:'method_not_allowed'});
 const actual=req.headers.authorization,expected='Bearer '+process.env.CRON_SECRET;
 if(!process.env.CRON_SECRET||typeof actual!=='string'||Buffer.byteLength(actual)!==Buffer.byteLength(expected)||
    !timingSafeEqual(Buffer.from(actual),Buffer.from(expected)))
  return res.status(403).json({error:'access_denied'});
 let failures=0;
 try {
  // New Pocket HR requests and replies are Supabase-owned. Legacy Sheets must not
  // determine whether an outbox turn is retried or an approved answer auto-closes.
  // Paginate both candidate sets: a fixed 1,000-row limit silently strands
  // newer deliveries once enough old, already-closed records accumulate.
  const pageSize=500;
  const ids=new Set<string>();
  for(let offset=0;;offset+=pageSize) {
   const pending=await db<ConversationState[]>(
    'pocket_hr_conversations?select=*&pending_sync=eq.true&closed_at=is.null&order=request_id.asc&limit='+pageSize+'&offset='+offset
   );
   for(const item of pending) if(item.request_id) ids.add(item.request_id);
   if(pending.length<pageSize) break;
  }
  const cutoff=new Date(Date.now()-AUTO_CLOSE_MS).toISOString();
  for(let offset=0;;offset+=pageSize) {
   const expired=await db<Array<{request_id:string}>>(
    'pocket_hr_deliveries?select=request_id&result=eq.success&delivered_at=lt.'+
     encodeURIComponent(cutoff)+'&order=delivered_at.asc,id.asc&limit='+pageSize+'&offset='+offset
   );
   for(const item of expired) if(item.request_id) ids.add(item.request_id);
   if(expired.length<pageSize) break;
  }

  for(const id of ids) {
   try {
    await withTicketLock(id,async()=>{
     const state=await readConversation(id);
     if(!state || state.closed_at) return;
     if(state.pending_sync) {
      // Trust only the account joined to the stored request, never a cron payload
      // or a Google Sheets Owner_Email cell.
      const owners=await db<Array<{owner_account_id:string;title:string;category:string}>>(
       'pocket_hr_requests?select=owner_account_id,title,category&request_id=eq.'+encodeURIComponent(id)+'&limit=2'
      );
      if(owners.length!==1 || !owners[0].owner_account_id)
       throw new Error('request_owner_missing');
      const accounts=await db<Array<{email:string;disabled_at:string|null}>>(
       'pocket_hr_accounts?select=email,disabled_at&id=eq.'+
        encodeURIComponent(owners[0].owner_account_id)+'&limit=2'
      );
      if(accounts.length!==1 || accounts[0].disabled_at || !accounts[0].email)
       throw new Error('request_owner_missing');
      const ownerEmail=accounts[0].email.trim().toLowerCase();
      const last=state.entries.at(-1);
      if(last?.role==='user' && last.revision===state.reply_revision) {
       await syncReply(state,ownerEmail);
      } else if(state.entries.length===0 && state.reply_revision===0) {
       // Initial-request retries are not reply turns: the original user message
       // was already inserted transactionally by pocket_hr_create_request.
       if(!await hasPendingAgentDraft(id,1)) {
        await dispatchUnifiedRequest({
         requestId:id,revision:1,ownerEmail,title:owners[0].title,category:owners[0].category,description:state.original_request,
        });
       }
       if(await hasPendingAgentDraft(id,1)) await saveConversation({...state,pending_sync:false});
      } else {
       throw new Error('invalid_pending_sync_state');
      }
      return;
     }
     // Re-evaluate the latest matching approval/delivery under the per-ticket lock.
     const proof=await readProof(id);
     if(!proof.approval || proof.delivery?.result!=='success' ||
        proof.delivery.revision!==proof.approval.revision ||
        state.reply_revision>=proof.approval.revision ||
        !shouldAutoClose(proof.delivery.deliveredAt)) return;
     await saveConversation({...state,closed_at:new Date().toISOString(),close_reason:'timeout'});
    });
   } catch { failures++; }
  }
  return res.status(failures?503:200).json({ok:failures===0,failures});
 } catch { return res.status(503).json({error:'maintenance_unavailable'}); }
}
