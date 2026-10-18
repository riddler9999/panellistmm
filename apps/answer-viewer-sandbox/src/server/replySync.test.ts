import { beforeEach,describe,it,expect,vi } from 'vitest';
import { syncReply,type ConversationState } from './conversationLifecycle';
import { db,readTickets,updateSheetRequest } from './pocketHrData';
import { dispatchUnifiedRequest } from './unifiedDispatch';
vi.mock('./pocketHrData',()=>({db:vi.fn(),readTickets:vi.fn(),updateSheetRequest:vi.fn()}));
vi.mock('./unifiedDispatch',()=>({dispatchUnifiedRequest:vi.fn()}));
const state:ConversationState={request_id:'T',original_request:'Original',entries:[{role:'consultant',content:'Answer',revision:1},{role:'user',content:'More',revision:1}],reply_revision:1,pending_sync:true,closed_at:null,close_reason:null};
beforeEach(()=>vi.resetAllMocks());
describe('retryable n8n Sheet bridge',()=>{
 it('resets old draft and delivery fields along with full approved context',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original'}]);
  await syncReply(state);
  expect(updateSheetRequest).toHaveBeenCalledWith('T',expect.objectContaining({Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',Ticket_Status:'Submitted',Final_Answer:'',AI_Answer:'',Sheet_AI_Answer:''}));
  expect(dispatchUnifiedRequest).toHaveBeenCalledWith(expect.objectContaining({requestId:'T',description:'Original\n\nConsultant: Answer\n\nUser: More'}));
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation','POST',{p_state:{...state,pending_sync:false}});
 });
 it('preserves a new n8n draft and retries dispatch after a previous Sheet write',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',AI_Answer:'New response'}]);
  await syncReply(state);expect(updateSheetRequest).not.toHaveBeenCalled();expect(dispatchUnifiedRequest).toHaveBeenCalled();expect(db).toHaveBeenCalled();
 });
});
