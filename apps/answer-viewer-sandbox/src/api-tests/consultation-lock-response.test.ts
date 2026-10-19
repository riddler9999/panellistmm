import {beforeEach,describe,it,expect,vi} from 'vitest';
import approve from '../../api/consultation-approve';
import upload from '../../api/consultation-file';
import {authenticatedPrincipal} from '../server/passcodeAuth';
import {db,readProof,readTickets,acknowledgeDelivery,writeTicketPublication} from '../server/pocketHrData';
import {withTicketLock} from '../server/conversationLifecycle';
import {selectAttachments,validateAttachment,storeAttachment} from '../server/responseAttachments';
import {draftVersion} from '../server/draftVersion';
import {decodeResponse} from '../domain/reviewedResponse';
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/pocketHrData',()=>({db:vi.fn(),readProof:vi.fn(),readTickets:vi.fn(),acknowledgeDelivery:vi.fn(),writeTicketPublication:vi.fn()}));
vi.mock('../server/conversationLifecycle',()=>({readConversation:vi.fn(async()=>null),withTicketLock:vi.fn()}));
vi.mock('../server/responseAttachments',()=>({selectAttachments:vi.fn(),validateAttachment:vi.fn(),storeAttachment:vi.fn()}));
const ticket={'Row ID':'T',Owner_Email:'user@example.com',Ticket_Status:'Awaiting Review',AI_Answer:'Draft'};
const file={id:'00000000-0000-4000-8000-000000000001',name:'answer.pdf',mime:'application/pdf',size:100};
const headers={origin:'https://example.com',host:'example.com'};
function response(){let status=200;const res={status(n:number){status=n;return res;},setHeader(){},json:vi.fn(),send:vi.fn()};return {res,status:()=>status};}
beforeEach(()=>{
 vi.resetAllMocks();vi.mocked(authenticatedPrincipal).mockResolvedValue({accountId:'00000000-0000-4000-8000-000000000001',email:'admin@example.com',role:'Admin'});
 vi.mocked(readTickets).mockResolvedValue([ticket]);vi.mocked(readProof).mockResolvedValue({approval:null,delivery:null});
 vi.mocked(db).mockResolvedValue(1);vi.mocked(acknowledgeDelivery).mockResolvedValue(true);
 vi.mocked(selectAttachments).mockResolvedValue([file]);vi.mocked(storeAttachment).mockResolvedValue(file);
 vi.mocked(validateAttachment).mockResolvedValue({name:file.name,mime:file.mime,bytes:Buffer.from('file')});
});
describe('upload and approval response lifecycle',()=>{
 for(const operation of ['upload','approve'] as const){
  for(const cleanupFails of [false,true])it(`${operation} sends one response after lock cleanup (${cleanupFails?'failure':'success'})`,async()=>{
   const {res,status}=response();
   vi.mocked(withTicketLock).mockImplementation(async(_id,work)=>{
    const result=await work();expect(res.json).not.toHaveBeenCalled();
    if(cleanupFails)throw new Error('redis_request_failed');
    return result;
   });
   if(operation==='upload')await upload({method:'POST',headers,body:{requestId:'T',name:file.name,base64:'ZmlsZQ=='}},res);
   else await approve({method:'POST',headers,body:{action:'approve',requestId:'T',expectedRevision:0,draftVersion:draftVersion(ticket),content:'Edited answer',options:[],attachmentIds:[file.id]}},res);
   expect(res.json).toHaveBeenCalledTimes(1);expect(status()).toBe(cleanupFails?503:operation==='upload'?201:200);
   if(operation==='approve'){
    const approvalCall=vi.mocked(db).mock.calls.find(([path])=>String(path).startsWith('rpc/pocket_hr_approve_'));
    const input=approvalCall?.[2] as {p_approved_content?:string;p_content?:string};
    expect(decodeResponse(input.p_approved_content ?? input.p_content!)).toEqual({text:'Edited answer',options:[],attachments:[file]});
    expect(writeTicketPublication).toHaveBeenLastCalledWith('T',{C:'Approved',Y:'Approved'});
   }
  });
 }
});
