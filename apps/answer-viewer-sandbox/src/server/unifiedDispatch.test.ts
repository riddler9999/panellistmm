import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchUnifiedRequest } from './unifiedDispatch';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('unified request dispatcher',()=>{
 it('posts only the normalized server-owned request contract',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test/intake');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET','a'.repeat(40));
  const fetchMock=vi.fn<typeof fetch>(async()=>new Response(null,{status:202}));
  vi.stubGlobal('fetch',fetchMock);
  await dispatchUnifiedRequest({requestId:'T-1',revision:2,ownerEmail:'user@example.com',title:'Leave',category:'Policy',description:'How many days?'});
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://dispatcher.example.test/intake');
  expect(init?.headers).toEqual({ 'Content-Type':'application/json', Authorization:'Bearer '+'a'.repeat(40) });
  expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
   request_id:'T-1',revision:2,owner_email:'user@example.com',subject:'Leave',hr_issue:'Policy',
   description:'How many days?',attachments:[],source:'pocket-hr-web',
  }));
  expect(JSON.parse(String(init?.body))).not.toHaveProperty('user_id');
 });
 it('fails closed when the verified request owner is missing or malformed', async () => {
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL', 'https://dispatcher.example.test/intake');
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 202 }));
  vi.stubGlobal('fetch', fetchMock);
  for (const ownerEmail of ['', 'not-an-email', 'owner@example.com\nother@example.com']) {
   await expect(dispatchUnifiedRequest({
    requestId: 'T-1', revision: 2, ownerEmail, description: 'Follow-up',
   })).rejects.toThrow('dispatcher_identity_missing');
  }
  expect(fetchMock).not.toHaveBeenCalled();
 });
 it('fails closed when the dispatcher is missing, insecure, or unavailable',async()=>{
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,ownerEmail:'user@example.com',description:'x'})).rejects.toThrow('dispatcher_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','http://dispatcher.example.test');
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,ownerEmail:'user@example.com',description:'x'})).rejects.toThrow('dispatcher_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test');
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,ownerEmail:'user@example.com',description:'x'})).rejects.toThrow('dispatcher_auth_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET','short');
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,ownerEmail:'user@example.com',description:'x'})).rejects.toThrow('dispatcher_auth_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_SECRET','b'.repeat(40));
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:503})));
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,ownerEmail:'user@example.com',description:'x'})).rejects.toThrow('dispatcher_unavailable');
 });
});
