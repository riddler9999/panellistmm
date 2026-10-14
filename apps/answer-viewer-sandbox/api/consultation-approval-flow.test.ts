import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from './consultation-approve';
import { authenticatedPrincipal } from '../src/server/passcodeAuth';
import { db, readTickets, acknowledgeDelivery, writeTicketPublication } from '../src/server/pocketHrData';

vi.mock('../src/server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../src/server/pocketHrData',()=>({
 db:vi.fn(),readTickets:vi.fn(),acknowledgeDelivery:vi.fn(),writeTicketPublication:vi.fn()
}));
function response() {
 let status=200;let body:unknown;
 const res={status(n:number){status=n;return res;},setHeader(){},json(v:unknown){body=v;}};
 return {res,result:()=>({status,body})};
}
const req={method:'POST',headers:{origin:'https://panellistmm.vercel.app',host:'panellistmm.vercel.app'},
 body:{action:'approve',requestId:'T-1',expectedRevision:0,content:'Approved advice'}};
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
 });
 it('denies role spoofing without snapshot creation',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'user@example.com',role:'User'});
  const {res,result}=response();
  await handler(req,res);
  expect(result().status).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });
});