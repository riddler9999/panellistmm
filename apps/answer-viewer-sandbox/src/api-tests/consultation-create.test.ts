import {afterEach,describe,expect,it,vi} from 'vitest';
import handler from '../../api/consultation-create';
import {authenticatedPrincipal} from '../server/passcodeAuth';
import {createSheetRequest,readTickets,db} from '../server/pocketHrData';
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/pocketHrData',()=>({createSheetRequest:vi.fn(),readTickets:vi.fn(),updateSheetRequest:vi.fn(),db:vi.fn()}));
afterEach(()=>{vi.resetAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
describe('new request intake contract',()=>{
 it('carries form fields through the Sheet bridge to the n8n payload',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'user@example.com',role:'User'});
  vi.mocked(createSheetRequest).mockResolvedValue('T-new');
  vi.mocked(readTickets).mockResolvedValue([{'Row ID':'T-new',Owner_Email:'user@example.com',Ticket_Title:'Team structure',Ticket_Category:'Organization Chart / Structure',Request_Text:'Please help structure our sales team.'}]);
  vi.mocked(db).mockResolvedValue([]);
  vi.stubEnv('N8N_DISPATCH_WEBHOOK_URL','https://dispatcher.example.test/intake');
  const fetchMock=vi.fn<typeof fetch>(async()=>new Response(null,{status:202}));vi.stubGlobal('fetch',fetchMock);
  const response={status:vi.fn().mockReturnThis(),setHeader:vi.fn(),json:vi.fn()};
  await handler({method:'POST',headers:{origin:'https://app.example.test',host:'app.example.test'},body:{title:'Team structure',category:'Organization Chart / Structure',description:'Please help structure our sales team.'}},response);
  expect(createSheetRequest).toHaveBeenCalledWith('user@example.com','Team structure','Organization Chart / Structure','Please help structure our sales team.');
  expect(response.status).toHaveBeenCalledWith(201);
  expect(response.json).toHaveBeenCalledWith({ok:true,requestId:'T-new',dispatchPending:false});
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(expect.objectContaining({request_id:'T-new',user_id:'user@example.com',subject:'Team structure',hr_issue:'Organization Chart / Structure',description:'Please help structure our sales team.',attachments:[],source:'pocket-hr-web'}));
 });
});
