import type { ResponseAttachment } from '../domain/reviewedResponse.js';
import { randomUUID } from 'node:crypto';
import { db, readTickets, updateSheetRequest } from './pocketHrData.js';
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
/** Retryable outbox: the stored user turn is committed before the Sheet bridge. */
export async function syncReply(state: ConversationState): Promise<void> {
 const context = [state.original_request, ...state.entries.map(entry => `${entry.role === 'user' ? 'User' : 'Consultant'}: ${entry.content}${entry.options?.length?'\nOptions: '+entry.options.join(' / '):''}`)].join('\n\n');
 const current=(await readTickets()).find(row=>row['Row ID']===state.request_id);
 if(!current) throw new Error('ticket_not_found');
 // A retry may arrive after the Sheet write but before async dispatch was acknowledged.
 if(current.Request_Text!==context) {
  await updateSheetRequest(state.request_id, {
   Request_Text: context, AI_Answer: '', Sheet_AI_Answer: '', AI_Draft: '',
   Consultant_Answer: '', Clarification_Question: '', Needs_Clarification: '',
   Final_Answer: '', Review_Status: '', Processing_Status: '', Processing_Error: '',
   Ticket_Status: 'Submitted', Unified_Status: '',
  });
 }
 await dispatchUnifiedRequest({
  requestId: state.request_id,
  ownerEmail: String(current.Owner_Email??''),
  title: String(current.Ticket_Title??''),
  category: String(current.Ticket_Category??''),
  description: context,
 });
 await saveConversation({ ...state, pending_sync: false });
}
