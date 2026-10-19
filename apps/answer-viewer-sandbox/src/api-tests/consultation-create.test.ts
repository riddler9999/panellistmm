import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '../../api/consultation-create';

const mocks=vi.hoisted(()=>({
 authenticatedPrincipal:vi.fn(),
 db:vi.fn(),
 createSheetRequestWithId:vi.fn(),
 readConversation:vi.fn(),
 syncReply:vi.fn(),
}));
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:mocks.authenticatedPrincipal}));
vi.mock('../server/pocketHrData',()=>({db:mocks.db,createSheetRequestWithId:mocks.createSheetRequestWithId}));
vi.mock('../server/conversationLifecycle',()=>({readConversation:mocks.readConversation,syncReply:mocks.syncReply}));

function responseMock(){
 let code=200;let body:unknown;const headers=new Map<string,string>();
 const res={status(value:number){code=value;return res;},setHeader(name:string,value:string){headers.set(name.toLowerCase(),value);},json(value:unknown){body=value;}};
 return {res,result:()=>({code,body,headers})};
}
const key='123e4567-e89b-42d3-a456-426614174000';
const principal={accountId:'00000000-0000-4000-8000-000000000001',email:'verified@example.com',role:'User' as const};
const body={title:'Leave',category:'Policy',description:'How many leave days?',account_id:'forged-account',ownerEmail:'attacker@example.com',user_id:'attacker@example.com',role:'Admin'};

beforeEach(()=>{
 vi.resetAllMocks();
 mocks.authenticatedPrincipal.mockResolvedValue(principal);
 mocks.db.mockResolvedValue(true);
 mocks.createSheetRequestWithId.mockResolvedValue(key);
 mocks.syncReply.mockResolvedValue(undefined);
});
afterEach(()=>vi.unstubAllGlobals());

describe('Pocket HR request identity handoff',()=>{
 it('requires an idempotency key before any request writes',async()=>{
  const {res,result}=responseMock();
  await handler({method:'POST',headers:{origin:'https://app.test',host:'app.test'},body},res);
  expect(result().code).toBe(400);
  expect(mocks.db).not.toHaveBeenCalled();
  expect(mocks.createSheetRequestWithId).not.toHaveBeenCalled();
 });

 it('rejects forged identity when there is no valid session',async()=>{
  mocks.authenticatedPrincipal.mockResolvedValue(null);
  const {res,result}=responseMock();
  await handler({method:'POST',headers:{origin:'https://app.test',host:'app.test','idempotency-key':key},body},res);
  expect(result().code).toBe(403);
  expect(mocks.db).not.toHaveBeenCalled();
 });

 it('stores the verified owner and ignores forged identity fields',async()=>{
  const {res,result}=responseMock();
  await handler({method:'POST',headers:{origin:'https://app.test',host:'app.test','idempotency-key':key},body},res);
  expect(result().code).toBe(201);
  expect(mocks.db).toHaveBeenCalledWith('rpc/pocket_hr_create_request','POST',{
   p_request_id:key,p_owner_account_id:principal.accountId,p_content:body.description,
  });
  expect(mocks.createSheetRequestWithId).toHaveBeenCalledWith(key,principal.email,body.title,body.category,body.description);
  expect(mocks.syncReply).toHaveBeenCalledOnce();
 });

 it('does not duplicate the initial message or redispatch a completed retry',async()=>{
  mocks.db.mockResolvedValue(false);
  mocks.readConversation.mockResolvedValue({request_id:key,original_request:body.description,entries:[],closed_at:null,close_reason:null,reply_revision:0,pending_sync:false});
  const {res,result}=responseMock();
  await handler({method:'POST',headers:{origin:'https://app.test',host:'app.test','idempotency-key':key},body},res);
  expect(result().code).toBe(200);
  expect(mocks.createSheetRequestWithId).toHaveBeenCalledOnce();
  expect(mocks.syncReply).not.toHaveBeenCalled();
 });
});
