import type { ResponseAttachment } from '../domain/reviewedResponse.js';
import { createHash, randomUUID } from 'node:crypto';
import { db } from './pocketHrData.js';
import { redisCommand } from './pocketHrRedis.js';
import { dispatchUnifiedRequest } from './unifiedDispatch.js';
export const AUTO_CLOSE_MS = 48 * 60 * 60 * 1000;
export type ConversationEntry = { role: 'user' | 'consultant'; content: string; revision: number; attachments?: ResponseAttachment[]; options?:string[] };
export type ConversationState = {
 request_id: string; original_request: string; entries: ConversationEntry[];
 closed_at: string | null; close_reason: 'user' | 'timeout' | null;
 reply_revision: number; pending_sync: boolean;
};
export async function readConversation(id: string): Promise<ConversationState | null> {
 const rows = await db<ConversationState[]>('pocket_hr_conversations?request_id=eq.' + encodeURIComponent(id));
 return rows[0] ?? null;
}
export async function readConversations(ids: string[]): Promise<Map<string, ConversationState>> {
 const result = new Map<string, ConversationState>();
 for(let i=0;i<ids.length;i+=200) {
  const batch=ids.slice(i,i+200);
  const filter=batch.map(id=>JSON.stringify(id)).join(',');
  const rows=await db<ConversationState[]>('pocket_hr_conversations?request_id=in.('+encodeURIComponent(filter)+')');
  for(const row of rows) if(batch.includes(row.request_id)) result.set(row.request_id,row);
 }
 return result;
}
export async function saveConversation(state: ConversationState): Promise<void> {
 await db('rpc/pocket_hr_save_conversation', 'POST', { p_state: state });
}
/** Serialize application writes for a ticket; release only our own lock. */
export async function withTicketLock<T>(id: string, work: () => Promise<T>): Promise<T> {
 const key = 'pocket-hr:ticket-write:' + id;
 const token = randomUUID();
 if (await redisCommand(['SET', key, token, 'NX', 'EX', 120]) !== 'OK') throw new Error('ticket_busy');
 try { return await work(); }
 finally { await redisCommand(['EVAL', "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", 1, key, token]); }
}
export function shouldAutoClose(deliveredAt: string | null | undefined, now = Date.now()): boolean {
 if (!deliveredAt) return false;
 const timestamp = Date.parse(deliveredAt);
 return Number.isFinite(timestamp) && now - timestamp >= AUTO_CLOSE_MS;
}
/** Retryable Supabase outbox: persist the user turn before dispatching n8n. */
export async function syncReply(state: ConversationState): Promise<void> {
 const last=state.entries.at(-1);
 if(!last || last.role!=='user' || last.revision!==state.reply_revision) throw new Error('invalid_reply_state');
 const context=[state.original_request,...state.entries.map(entry =>
  `${entry.role==='user'?'User':'Consultant'}: ${entry.content}${entry.options?.length?'\\nOptions: '+entry.options.join(' / '):''}`
 )].join('\\n\\n');
 // Stable message ID makes retries safe after partial failures.
 const hex=createHash('sha256').update(state.request_id+':user:'+state.reply_revision).digest('hex');
 const messageId=[hex.slice(0,8),hex.slice(8,12),'4'+hex.slice(13,16),'8'+hex.slice(17,20),hex.slice(20,32)].join('-');
 const saved=await db<Array<{content:string;request_id:string}>>(
  'pocket_hr_messages?select=content,request_id&message_id=eq.'+messageId
 );
 if(saved.length>1 || (saved.length===1 && (saved[0].content!==last.content || saved[0].request_id!==state.request_id)))
  throw new Error('reply_message_conflict');
 if(!saved.length) await db('pocket_hr_messages','POST',{
  message_id:messageId,request_id:state.request_id,sender:'user',
  content:last.content,revision:state.reply_revision+1,review_state:'approved',
 });
 await dispatchUnifiedRequest({
  requestId:state.request_id,revision:state.reply_revision+1,
  description:context,
 });
 await saveConversation({...state,pending_sync:false});
}
