import { beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('../src/server/pocketHrAuth',()=>({authenticatedSession:vi.fn(),parseSessionCookie:vi.fn(()=> 'session')}));
vi.mock('../src/server/pocketHrData',()=>({db:vi.fn(),readTickets:vi.fn(),readProof:vi.fn(),acknowledgeDelivery:vi.fn()}));
import handler from './consultation-approve';
import {authenticatedSession} from '../src/server/pocketHrAuth';
import {db,readTickets,readProof,acknowledgeDelivery} from '../src/server/pocketHrData';
const mock=()=>{
 let status=200,body:unknown;
 const res={status(n:number){status=n;return res},setHeader(){},json(v:unknown){body=v}};
 return {res,result:()=>({status,body})};
};
const req=(body:unknown,headers:Record<string,string>={origin:'https://app.example.com',host:'app.example.com',cookie:'pocket_hr_session=token'})=>({method:'POST',headers,body});
describe('consultant approval API',()=>{
 beforeEach(()=>{
  vi.resetAllMocks();
  vi.mocked(authenticatedSession).mockResolvedValue({email:'consultant@example.com',role:'Admin',accountId:'account-1'});
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'r-1',Owner_Email:'owner@example.com',Final_Answer:'Approved'}]);
  vi.mocked(readProof).mockResolvedValue({approval:null,delivery:null});
  vi.mocked(db).mockResolvedValue([]);
  vi.mocked(acknowledgeDelivery).mockResolvedValue(true);
 });
 it('rejects role forgery and cross-origin writes',async()=>{
  vi.mocked(authenticatedSession).mockResolvedValueOnce({email:'owner@example.com',role:'User',accountId:'user-1'});
  const a=mock();await handler(req({requestId:'r-1',revision:1}),a.res);expect(a.result().status).toBe(403);
  const b=mock();await handler(req({requestId:'r-1',revision:1},{origin:'https://evil.example',host:'app.example.com'}),b.res);expect(b.result().status).toBe(403);
  expect(db).not.toHaveBeenCalled();
 });
 it('rejects malformed Origin without throwing',async()=>{
  const m=mock();await handler(req({requestId:'r-1',revision:1},{origin:'not a url',host:'app.example.com'}),m.res);
  expect(m.result().status).toBe(403);
 });
 it('rejects revision 2 without an authoritative revision source',async()=>{
  const m=mock();await handler(req({requestId:'r-1',revision:2}),m.res);
  expect(m.result().status).toBe(409);
  expect(db).not.toHaveBeenCalled();
 });
 it('creates immutable approval then acknowledges delivery',async()=>{
  const m=mock();await handler(req({requestId:'r-1',revision:1}),m.res);
  expect(m.result().status).toBe(200);
  expect(db).toHaveBeenCalledWith('pocket_hr_approvals','POST',expect.objectContaining({request_id:'r-1',revision:1,approved_content:'Approved',approved_by_account_id:'account-1'}));
  expect(acknowledgeDelivery).toHaveBeenCalledWith('r-1',1);
 });
 it('retries delivery without duplicating existing approval',async()=>{
  vi.mocked(readProof).mockResolvedValueOnce({approval:{requestId:'r-1',revision:1,approvedContent:'Approved',approvedByAccountId:'account-1',approvedAt:'2026-10-14'},delivery:null});
  const m=mock();await handler(req({requestId:'r-1',revision:1}),m.res);
  expect(m.result().status).toBe(200);expect(db).not.toHaveBeenCalled();
 });
 it('blocks stale revisions and content changes',async()=>{
  vi.mocked(readProof).mockResolvedValueOnce({approval:{requestId:'r-1',revision:1,approvedContent:'Old',approvedByAccountId:'account-1',approvedAt:'2026-10-14'},delivery:null});
  const m=mock();await handler(req({requestId:'r-1',revision:1}),m.res);
  expect(m.result().status).toBe(409);expect(acknowledgeDelivery).not.toHaveBeenCalled();
 });
 it('fails closed on delivery failure',async()=>{
  vi.mocked(acknowledgeDelivery).mockResolvedValueOnce(false);
  const m=mock();await handler(req({requestId:'r-1',revision:1}),m.res);
  expect(m.result().status).toBe(503);
 });
});
