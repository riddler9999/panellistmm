import { draftVersion } from '../server/draftVersion';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-approve';
import { authenticatedPrincipal } from '../server/passcodeAuth';
import { db, readProof, readTickets, acknowledgeDelivery, writeTicketPublication } from '../server/pocketHrData';

vi.mock('../server/conversationLifecycle',()=>({readConversation:vi.fn(async()=>null),withTicketLock:vi.fn(async(_id:string,work:()=>Promise<unknown>)=>work())}));
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/pocketHrData',()=>({
 readProof:vi.fn(async()=>({approval:null,delivery:null})),db:vi.fn(),readTickets:vi.fn(),acknowledgeDelivery:vi.fn(),writeTicketPublication:vi.fn()
}));
function response() {
 let status=200;let body:unknown;
 const res={status(n:number){status=n;return res;},setHeader(){},json(v:unknown){body=v;}};
 return {res,result:()=>({status,body})};
}
const req={method:'POST',headers:{origin:'https://panellistmm.vercel.app',host:'panellistmm.vercel.app'},
 body:{draftVersion:draftVersion({'Row ID':'T-1',Owner_Email:'user@example.com'}),action:'approve',requestId:'T-1',expectedRevision:0,content:'Approved advice'}};
describe('approval publication ordering',()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'admin@example.com',role:'Admin'});
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com'}]);
  vi.mocked(db).mockResolvedValue(1);
  vi.mocked(acknowledgeDelivery).mockResolvedValue(true);
  vi.mocked(writeTicketPublication).mockResolvedValue(undefined);
 });
 it('publishes approved Sheet status only after acknowledged snapshot',async()=>{
  const {res,result}=response();
  await handler(req,res);
  expect(result().status).toBe(200);
  expect(db).toHaveBeenCalledWith('rpc/pocket_hr_approve_snapshot','POST',expect.objectContaining({p_expected_revision:0}));
  expect(writeTicketPublication).toHaveBeenNthCalledWith(1,'T-1',{C:'Delivery Pending',Y:'Delivery Pending'});
  expect(writeTicketPublication).toHaveBeenNthCalledWith(2,'T-1',{H:'Approved advice'});
  expect(writeTicketPublication).toHaveBeenNthCalledWith(3,'T-1',{C:'Approved',Y:'Approved'});
  expect(vi.mocked(acknowledgeDelivery).mock.invocationCallOrder[0])
    .toBeLessThan(vi.mocked(writeTicketPublication).mock.invocationCallOrder[2]);
 });
 it('does not mark Sheet approved if acknowledgement fails',async()=>{
  vi.mocked(acknowledgeDelivery).mockResolvedValue(false);
  const {res,result}=response();
  await handler(req,res);
  expect(result().status).toBe(503);
  expect(writeTicketPublication).toHaveBeenCalledTimes(2);
  expect(writeTicketPublication).not.toHaveBeenCalledWith('T-1',{C:'Approved',Y:'Approved'});
 });
 it('denies role spoofing without snapshot creation',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'user@example.com',role:'User'});
  const {res,result}=response();
  await handler(req,res);
  expect(result().status).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });
 it('keeps resolved requests read-only even for Admin',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com',Ticket_Status:'Resolved'}]);
  const {res,result}=response();
  await handler(req,res);
  expect(result().status).toBe(409);
  expect(db).not.toHaveBeenCalled();
  expect(writeTicketPublication).not.toHaveBeenCalled();
 });
 it('rejects a changed draft before creating any snapshot',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com',AI_Answer:'new assessment'}]);
  const {res,result}=response();await handler(req,res);
  expect(result().status).toBe(409);expect(db).not.toHaveBeenCalled();
 });
 it('does not approve an already delivered response again',async()=>{
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-1',Owner_Email:'user@example.com',Ticket_Status:'Approved'}]);
  const {res,result}=response();await handler(req,res);
  expect(result().status).toBe(409);expect(db).not.toHaveBeenCalled();
 });
 it('resumes the same committed snapshot after publication failure',async()=>{
  vi.mocked(readProof).mockResolvedValue({approval:{requestId:'T-1',revision:1,approvedContent:'Approved advice',approvedByEmail:'admin@example.com',approvedAt:'2026-10-16T00:00:00Z'},delivery:null});
  const {res,result}=response();await handler(req,res);
  expect(result().status).toBe(200);expect(db).not.toHaveBeenCalled();expect(acknowledgeDelivery).toHaveBeenCalledWith('T-1',1);
 });

});
