import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchUnifiedRequest } from './unifiedDispatch';

const input={requestId:'T-1',revision:2,ownerEmail:'user@example.com',title:'Leave',category:'Policy',description:'How many days?'};
const token='test-only-service-token-with-at-least-32-characters';
const ack={ok:true,request_id:input.requestId,revision:input.revision,ai_draft_stored:true};

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('unified request dispatcher',()=>{
 it('sends a service credential and verified server-owned identity',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test/intake');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET',token);
  const fetchMock=vi.fn<typeof fetch>(async()=>new Response(null,{status:202}));
  vi.stubGlobal('fetch',fetchMock);
  await expect(dispatchUnifiedRequest(input)).resolves.toBe('accepted');
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://dispatcher.example.test/intake');
  expect(init?.headers).toEqual({'Content-Type':'application/json',Authorization:'Bearer '+token});
  expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
   request_id:input.requestId,revision:input.revision,user_id:input.ownerEmail,
   subject:input.title,hr_issue:input.category,description:input.description,
   attachments:[],source:'pocket-hr-web',
  }));
 });

 it('accepts a 200 only with a matching stored-draft acknowledgement',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET',token);
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>Response.json(ack,{status:200})));
  await expect(dispatchUnifiedRequest(input)).resolves.toBe('draft_stored');
 });

 it('does not treat 202 as a stored draft and rejects invalid acknowledgements',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET',token);
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:202})));
  await expect(dispatchUnifiedRequest(input)).resolves.toBe('accepted');
  for(const response of [
   new Response('not-json',{status:200}),
   Response.json({...ack,ai_draft_stored:false},{status:200}),
   Response.json({...ack,request_id:'another-request'},{status:200}),
   Response.json({...ack,revision:input.revision+1},{status:200}),
  ]){
   vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>response.clone()));
   await expect(dispatchUnifiedRequest(input)).rejects.toThrow('dispatcher_ack_invalid');
  }
 });

 it('fails closed when service auth, owner identity, or dispatcher configuration is missing',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test/intake');
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:202})));
  await expect(dispatchUnifiedRequest(input)).rejects.toThrow('dispatcher_auth_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET',token);
  for(const ownerEmail of ['', 'not-an-email', 'owner@example.com\nother@example.com'])
   await expect(dispatchUnifiedRequest({...input,ownerEmail})).rejects.toThrow('dispatcher_identity_missing');
  expect(fetch).not.toHaveBeenCalled();
  await expect(dispatchUnifiedRequest({...input,ownerEmail:'user@example.com'})).resolves.toBe('accepted');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','http://dispatcher.example.test');
  await expect(dispatchUnifiedRequest(input)).rejects.toThrow('dispatcher_not_configured');
 });

 it('fails when the dispatcher denies or rejects the service request',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET',token);
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:403})));
  await expect(dispatchUnifiedRequest(input)).rejects.toThrow('dispatcher_unavailable');
 });
});
