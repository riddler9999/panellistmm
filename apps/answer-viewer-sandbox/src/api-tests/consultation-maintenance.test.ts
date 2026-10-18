import { beforeEach,afterEach,describe,it,expect,vi } from 'vitest';
import handler from '../../api/consultation-maintenance';
import { readTickets,readProof,readProofs } from '../server/pocketHrData';
import { readConversation,readConversations,saveConversation } from '../server/conversationLifecycle';
vi.mock('../server/pocketHrData',()=>({readTickets:vi.fn(),readProof:vi.fn(),readProofs:vi.fn()}));
vi.mock('../server/conversationLifecycle',async(importOriginal)=>({
 ...await importOriginal<typeof import('../server/conversationLifecycle')>(),
 readConversation:vi.fn(),readConversations:vi.fn(),saveConversation:vi.fn(),syncReply:vi.fn(),withTicketLock:async(_id:string,work:()=>Promise<unknown>)=>work(),
}));
const proof={approval:{requestId:'T',revision:1,approvedContent:'Answer',approvedByEmail:'admin@example.com',approvedAt:'2026-10-13T00:00:00Z'},delivery:{requestId:'T',revision:1,result:'success' as const,deliveredAt:'2026-10-13T00:00:00Z'}};
async function call(authorization='Bearer test-secret'){
 let status=200;const res={status(n:number){status=n;return res;},setHeader(){},json:vi.fn()};
 await handler({method:'GET',headers:{authorization}},res);return status;
}
beforeEach(()=>{
 vi.resetAllMocks();vi.stubEnv('CRON_SECRET','test-secret');vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-16T00:00:00Z'));
 vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Ticket_Status:'Approved',Request_Text:'Original'}]);
 vi.mocked(readConversations).mockResolvedValue(new Map());vi.mocked(readConversation).mockResolvedValue(null);
 vi.mocked(readProofs).mockResolvedValue(new Map([['T',proof]]));vi.mocked(readProof).mockResolvedValue(proof);
});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();});
describe('scheduled closure',()=>{
 it('rejects an unauthenticated cron call',async()=>{expect(await call('Bearer bad')).toBe(403);expect(readTickets).not.toHaveBeenCalled();});
 it('persists closure of an inactive approved request',async()=>{expect(await call()).toBe(200);expect(saveConversation).toHaveBeenCalledWith(expect.objectContaining({request_id:'T',close_reason:'timeout'}));});
 it('does not close a ticket that received a reply before the lock',async()=>{
  vi.mocked(readTickets).mockResolvedValueOnce([{'Row ID':'T',Ticket_Status:'Approved'}]).mockResolvedValue([{'Row ID':'T',Ticket_Status:'Submitted'}]);
  expect(await call()).toBe(200);expect(saveConversation).not.toHaveBeenCalled();
 });
 it('does not close a newly delivered round based on an older deadline',async()=>{
  vi.mocked(readProof).mockResolvedValue({...proof,approval:{...proof.approval,revision:2},delivery:{...proof.delivery,revision:2,deliveredAt:'2026-10-16T00:00:00Z'}});
  expect(await call()).toBe(200);expect(saveConversation).not.toHaveBeenCalled();
 });
});
