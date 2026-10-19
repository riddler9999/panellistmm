import { beforeEach,describe,it,expect,vi } from 'vitest';
import { syncReply,type ConversationState } from './conversationLifecycle';
import { db,readTickets,updateSheetRequest,readProof } from './pocketHrData';
import { dispatchUnifiedRequest } from './unifiedDispatch';
vi.mock('./pocketHrData',()=>({db:vi.fn(),readTickets:vi.fn(),updateSheetRequest:vi.fn(),readProof:vi.fn(async()=>({approval:null,delivery:null}))}));
vi.mock('./unifiedDispatch',()=>({dispatchUnifiedRequest:vi.fn()}));
const state:ConversationState={request_id:'T',original_request:'Original',entries:[{role:'consultant',content:'Answer',revision:1},{role:'user',content:'More',revision:1}],reply_revision:1,pending_sync:true,closed_at:null,close_reason:null};
beforeEach(()=>{vi.resetAllMocks();vi.mocked(readProof).mockResolvedValue({approval:null,delivery:null});});
describe('retryable n8n Sheet bridge',()=>{
 it('resets old draft and delivery fields along with full approved context',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original'}]);
  await syncReply(state);
  expect(updateSheetRequest).toHaveBeenCalledWith('T',expect.objectContaining({Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',Ticket_Status:'Submitted',Final_Answer:'',AI_Answer:'',Sheet_AI_Answer:''}));
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith(expect.objectContaining({requestId:'T',description:'Original\n\nConsultant: Answer\n\nUser: More'}));
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation','POST',{p_state:{...state,pending_sync:false}});
 });
 it('refuses a stale retry after a newer approved revision',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original'}]);
  vi.mocked(readProof).mockResolvedValue({approval:{requestId:'T',revision:2,approvedContent:'new answer',approvedAt:'2026-10-19T00:00:00Z'},delivery:null});
  await expect(syncReply(state)).rejects.toThrow('stale_reply_sync');
  expect(updateSheetRequest).not.toHaveBeenCalled();
  expect(dispatchUnifiedRequest).not.toHaveBeenCalled();
 });
 it('preserves a new n8n draft and retries dispatch after a previous Sheet write',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',AI_Answer:'New response'}]);
  await syncReply(state);expect(updateSheetRequest).not.toHaveBeenCalled();expect(dispatchUnifiedRequest).toHaveBeenCalled();expect(db).toHaveBeenCalled();
 });
});
