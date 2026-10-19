import { afterEach, describe, expect, it, vi } from 'vitest';
import { dispatchUnifiedRequest } from './unifiedDispatch';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});

describe('unified request dispatcher',()=>{
 it('posts only the normalized server-owned request contract',async()=>{
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test/intake');
  const fetchMock=vi.fn<typeof fetch>(async()=>new Response(null,{status:202}));
  vi.stubGlobal('fetch',fetchMock);
  await dispatchUnifiedRequest({requestId:'T-1',revision:2,ownerEmail:'user@example.com',title:'Leave',category:'Policy',description:'How many days?'});
  expect(fetchMock).toHaveBeenCalledOnce();
  const [url,init]=fetchMock.mock.calls[0];
  expect(String(url)).toBe('https://dispatcher.example.test/intake');
  expect(Object.keys(init?.headers as Record<string,string>)).toEqual(['Content-Type']);
  expect(JSON.parse(String(init?.body))).toEqual(expect.objectContaining({
   request_id:'T-1',revision:2,user_id:'user@example.com',subject:'Leave',hr_issue:'Policy',
   description:'How many days?',attachments:[],source:'pocket-hr-web',
  }));
 });
 it('fails closed when the dispatcher is missing, insecure, or unavailable',async()=>{
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,description:'x'})).rejects.toThrow('dispatcher_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','http://dispatcher.example.test');
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,description:'x'})).rejects.toThrow('dispatcher_not_configured');
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test');
  vi.stubGlobal('fetch',vi.fn<typeof fetch>(async()=>new Response(null,{status:503})));
  await expect(dispatchUnifiedRequest({requestId:'T',revision:1,description:'x'})).rejects.toThrow('dispatcher_unavailable');
 });
});
