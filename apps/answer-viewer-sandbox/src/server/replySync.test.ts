import { beforeEach,describe,it,expect,vi } from 'vitest';
import { syncReply,type ConversationState } from './conversationLifecycle';
import { db,readTickets,updateSheetRequest } from './pocketHrData';
vi.mock('./pocketHrData',()=>({db:vi.fn(),readTickets:vi.fn(),updateSheetRequest:vi.fn()}));
const state:ConversationState={request_id:'T',original_request:'Original',entries:[{role:'consultant',content:'Answer',revision:1},{role:'user',content:'More',revision:1}],reply_revision:1,pending_sync:true,closed_at:null,close_reason:null};
beforeEach(()=>vi.resetAllMocks());
describe('retryable n8n Sheet bridge',()=>{
 it('resets old draft and delivery fields along with full approved context',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original'}]);
  await syncReply(state);
  expect(updateSheetRequest).toHaveBeenCalledWith('T',expect.objectContaining({Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',Ticket_Status:'Submitted',Final_Answer:'',AI_Answer:'',Sheet_AI_Answer:''}));
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_save_conversation','POST',{p_state:{...state,pending_sync:false}});
 });
 it('does not erase a new n8n draft if a previous Sheet write succeeded before interruption',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Request_Text:'Original\n\nConsultant: Answer\n\nUser: More',AI_Answer:'New response'}]);
  await syncReply(state);expect(updateSheetRequest).not.toHaveBeenCalled();expect(db).toHaveBeenCalled();
 });
});
