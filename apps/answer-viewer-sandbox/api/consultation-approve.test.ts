import { describe,expect,it } from 'vitest';
import handler from './consultation-approve';
function mockResponse() {
  let status = 200;
  let body: unknown;
  const headers = new Map<string,string>();
  const res = {
    status(n:number) { status=n; return res; },
    setHeader(k:string,v:string) { headers.set(k.toLowerCase(),v); },
    json(value:unknown) { body=value; },
  };
  return {res,result:()=>({status,body,headers})};
}
describe('consultant approval API identity boundary', () => {
  it('rejects unauthenticated writes without changing data', async () => {
    const {res,result}=mockResponse();
    await handler({method:'POST',headers:{},body:{requestId:'r-1',action:'approve'}},res);
    expect(result().status).toBe(403);
    expect(result().body).toEqual({error:'access_denied'});
    expect(result().headers.get('cache-control')).toContain('no-store');
  });
  it('never trusts forged email, role or bearer headers', async () => {
    const {res,result}=mockResponse();
    await handler({method:'POST',headers:{'x-user-email':'consultant@example.com','x-user-role':'Admin',authorization:'Bearer forged'}},res);
    expect(result().status).toBe(403);
  });
  it('rejects unsupported HTTP methods', async () => {
    const {res,result}=mockResponse();
    await handler({method:'GET',headers:{}},res);
    expect(result().status).toBe(405);
  });
});
