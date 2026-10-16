import { encodeResponse } from '../src/domain/reviewedResponse';
import { beforeEach,describe,it,expect,vi } from 'vitest';
import handler from './consultation-reply';
import { authenticatedPrincipal } from '../src/server/passcodeAuth';
import { readTickets,readProof } from '../src/server/pocketHrData';
import { readConversation,saveConversation,syncReply } from '../src/server/conversationLifecycle';
vi.mock('../src/server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../src/server/pocketHrData',()=>({readTickets:vi.fn(),readProof:vi.fn()}));
vi.mock('../src/server/conversationLifecycle',async(importOriginal)=>({
 ...await importOriginal<typeof import('../src/server/conversationLifecycle')>(),
 readConversation:vi.fn(),saveConversation:vi.fn(),syncReply:vi.fn(),withTicketLock:async(_id:string,work:()=>Promise<unknown>)=>work(),
}));
const headers={origin:'https://example.com',host:'example.com'};
const body={action:'reply',requestId:'T-1',expectedRevision:1,content:'Follow-up'};
async function call(input:unknown=body){
 let status=200;const res={status(n:number){status=n;return res;},setHeader(){},json:vi.fn()};
 await handler({method:'POST',headers,body:input},res);return status;
}
beforeEach(()=>{
 vi.resetAllMocks();
 vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'user@example.com'});
 vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com',Ticket_Status:'Approved',Request_Text:'Initial request'}]);
 vi.mocked(readConversation).mockResolvedValue(null);
 vi.mocked(readProof).mockResolvedValue({approval:{requestId:'T-1',revision:1,approvedContent:'Approved reply',approvedByEmail:'admin@example.com',approvedAt:new Date().toISOString()},delivery:{requestId:'T-1',revision:1,result:'success',deliveredAt:new Date().toISOString()}});
});
describe('owner reply and close',()=>{
 it('preserves approved conversation before resetting the bridge',async()=>{
  expect(await call()).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({original_request:'Initial request',reply_revision:1,pending_sync:true,entries:[{role:'consultant',content:'Approved reply',revision:1},{role:'user',content:'Follow-up',revision:1}]}));
  expect(vi.mocked(saveConversation).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(syncReply).mock.invocationCallOrder[0]);
 });
 it('denies another owner and Admin closing through this endpoint',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'other@example.com'});
  expect(await call({action:'close',requestId:'T-1'})).toBe(404);
  vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'Admin',email:'admin@example.com'});
  expect(await call({action:'close',requestId:'T-1'})).toBe(403);
  expect(saveConversation).not.toHaveBeenCalled();
 });
 it('allows owner to close without an approved response',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com',Ticket_Status:'Submitted'}]);
  expect(await call({action:'close',requestId:'T-1'})).toBe(200);
  expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({close_reason:'user',closed_at:expect.any(String)}));
 });
 it('rejects stale rounds and replies after 48 hours',async()=>{
  expect(await call({...body,expectedRevision:2})).toBe(409);
  const proof=await readProof('T-1');proof.delivery!.deliveredAt='2000-01-01T00:00:00Z';vi.mocked(readProof).mockResolvedValue(proof);
  expect(await call()).toBe(409);
  expect(saveConversation).not.toHaveBeenCalled();
 });
 it('retries a pending bridge write without duplicating user history',async()=>{
  vi.mocked(readConversation).mockResolvedValue({request_id:'T-1',original_request:'Initial',entries:[{role:'user',content:'Follow-up',revision:1}],closed_at:null,close_reason:null,reply_revision:1,pending_sync:true});
  expect(await call()).toBe(200);expect(syncReply).toHaveBeenCalledTimes(1);expect(saveConversation).not.toHaveBeenCalled();
 });
 it('retains a durable pending turn when the bridge fails',async()=>{
  vi.mocked(syncReply).mockRejectedValueOnce(new Error('unavailable'));
  expect(await call()).toBe(503);expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({pending_sync:true}));
 });
 it('preserves approved files and choices when a new round starts',async()=>{
  const proof=await readProof('T-1');
  const attachments=[{id:'00000000-0000-4000-8000-000000000001',name:'form.xlsx',mime:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',size:100}];
  proof.approval!.approvedContent=encodeResponse({text:'Choose a type',options:['A','B'],attachments});
  vi.mocked(readProof).mockResolvedValue(proof);
  expect(await call()).toBe(200);
  const saved=vi.mocked(saveConversation).mock.calls[0][0];
  expect(saved.entries[0]).toMatchObject({content:'Choose a type',options:['A','B'],attachments});
 });

});
