import {beforeEach,describe,it,expect,vi} from 'vitest';
import handler from '../../api/consultation-file';
import {authenticatedPrincipal} from '../server/passcodeAuth';
import {db,readTickets} from '../server/pocketHrData';
import {readAttachment,downloadAttachment} from '../server/responseAttachments';
import {encodeResponse} from '../domain/reviewedResponse';
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/pocketHrData',()=>({db:vi.fn(),readTickets:vi.fn()}));
vi.mock('../server/conversationLifecycle',()=>({readConversation:vi.fn(async()=>null),withTicketLock:async(_id:string,work:()=>Promise<unknown>)=>work()}));
vi.mock('../server/responseAttachments',()=>({readAttachment:vi.fn(),downloadAttachment:vi.fn(),validateAttachment:vi.fn(),storeAttachment:vi.fn()}));
const id='00000000-0000-4000-8000-000000000001';
const file={id,name:'chart.png',mime:'image/png',size:100,request_id:'T',object_path:id,uploaded_by:'admin@example.com'};
async function call(method='GET'){
 let status=200;const headers:Record<string,string>={};const res={status(n:number){status=n;return res;},setHeader(k:string,v:string){headers[k]=v;},json:vi.fn(),send:vi.fn()};
 await handler({method,headers:{origin:'https://example.com',host:'example.com'},query:{id,revision:'1'},body:{requestId:'T'}},res);return {status,res,headers};
}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'owner@example.com'});
 vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Owner_Email:'owner@example.com',Ticket_Status:'Approved'}]);
 vi.mocked(readAttachment).mockResolvedValue(file);vi.mocked(downloadAttachment).mockResolvedValue(Buffer.from('PNG'));
 vi.mocked(db).mockImplementation(async(path)=>path.startsWith('pocket_hr_approvals')?[{approved_content:encodeResponse({text:'Approved',options:[],attachments:[file]})}]:[{result:'success'}]);
});
describe('attachment access',()=>{
 it('serves only an owner-authorized approved attachment',async()=>{const result=await call();expect(result.status).toBe(200);expect(result.res.send).toHaveBeenCalled();expect(result.headers['Content-Disposition']).toContain('attachment;');expect(result.headers['Cache-Control']).toContain('no-store');});
 it('denies cross-ticket owner access',async()=>{vi.mocked(authenticatedPrincipal).mockResolvedValue({role:'User',email:'other@example.com'});expect((await call()).status).toBe(404);expect(downloadAttachment).not.toHaveBeenCalled();});
 it('denies files absent from approval or pending publication',async()=>{
  vi.mocked(db).mockResolvedValue([]);expect((await call()).status).toBe(404);
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T',Owner_Email:'owner@example.com',Ticket_Status:'Delivery Pending'}]);expect((await call()).status).toBe(404);expect(downloadAttachment).not.toHaveBeenCalled();
 });
 it('does not allow a normal user to upload consultant files',async()=>{expect((await call('POST')).status).toBe(403);});
});
