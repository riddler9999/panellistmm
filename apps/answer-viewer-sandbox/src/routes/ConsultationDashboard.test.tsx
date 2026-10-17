import { afterEach,describe,expect,it,vi } from 'vitest';
import { cleanup,render,screen } from '@testing-library/react';
import { ConsultationDashboard } from './ConsultationDashboard';
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('production Pocket HR dashboard',()=>{
 it('fails closed when session is absent',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:false,status:403})));
  render(<ConsultationDashboard />);
  expect(await screen.findByText('Pocket HR')).toBeInTheDocument();
  expect(screen.queryByText('All Requests')).not.toBeInTheDocument();
  expect(screen.queryByText('Preview Reference UI')).not.toBeInTheDocument();
 });
 it('renders live server-authorized tickets, no demo entry point',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,status:200,json:async()=>({
   role:'User',tickets:[{ticketId:'A-001',title:'Live request',status:'Submitted',history:[]}]
  })})));
  render(<ConsultationDashboard />);
  expect(await screen.findByText('Live request')).toBeInTheDocument();
  expect(screen.queryByText('Preview Reference UI')).not.toBeInTheDocument();
 });
});
describe('review conversation UI',()=>{
 it('groups Submitted aliases into one clear filter',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({role:'Admin',tickets:[
   {ticketId:'1',title:'First',status:'Submitted',history:[]},
   {ticketId:'2',title:'Second',status:'ဖောင်ပို့ပြီး (Submitted)',history:[]}
  ]})})));
  render(<ConsultationDashboard/>);
  expect(await screen.findByRole('button',{name:'Processing (2)'})).toBeInTheDocument();
  expect(screen.queryByText(/Submitted/)).not.toBeInTheDocument();
 });
 it('shows original user request first and approves the existing draft without retyping',async()=>{
  const {default:userEvent}=await import('@testing-library/user-event');
  const user=userEvent.setup();let approved=false;
  const fetchMock=vi.fn(async(url:unknown)=>{
   if(url==='/api/consultation-approve'){approved=true;return {ok:true};}
   return {ok:true,json:async()=>({role:'Admin',tickets:[{ticketId:'1',title:'Test request',status:approved?'Approved':'Awaiting Review',description:'Original question',history:[{type:'ADVICE',content:'Proposed response',round:0}],responseApproved:approved,finalAnswer:approved?'Proposed response':undefined}]})};
  });
  vi.stubGlobal('fetch',fetchMock);render(<ConsultationDashboard side="admin"/>);
  await user.click(await screen.findByText('Test request'));
  const articles=screen.getAllByRole('article');expect(articles[0]).toHaveTextContent('Original question');
  expect(articles[1]).toHaveTextContent('Proposed response');
  await user.click(screen.getByRole('button',{name:'Approve'}));
  expect(await screen.findByRole('button',{name:'Approved ✓'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Edit'})).not.toBeInTheDocument();
  const write=fetchMock.mock.calls.find(call=>call[0]==='/api/consultation-approve');expect(write).toBeDefined();
 });
});

describe('named requester and free-form clarification',()=>{
 it('lets the user answer without choosing an AI option',async()=>{
  const {default:userEvent}=await import('@testing-library/user-event');const user=userEvent.setup();
  const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({role:'User',tickets:[{ticketId:'T',title:'Clarification',requesterName:'မောင်မောင်',description:'Question',status:'Approved',history:[],responseApproved:true,finalAnswer:'Employment type?',options:['Permanent','Contract'],revision:1}]})}));
  vi.stubGlobal('fetch',fetchMock);render(<ConsultationDashboard/>);
  await user.click(await screen.findByText('Clarification'));
  expect(screen.getByText('မောင်မောင် · Request')).toBeInTheDocument();
  expect(screen.getByRole('radio',{name:'Write my own answer'})).toBeChecked();
  await user.type(screen.getByLabelText('Your answer / additional details'),'Internship');
  await user.click(screen.getByRole('button',{name:'Send follow-up'}));
  const calls=fetchMock.mock.calls as unknown as Array<[string,RequestInit]>;
  const sent=calls.find(call=>call[0]==='/api/consultation-reply');
  expect(JSON.parse(sent![1].body as string).content).toBe('Internship');
 });
});

describe('separate portal controls',()=>{
 it('keeps admin controls off the user URL even with an admin response',async()=>{
  const {default:userEvent}=await import('@testing-library/user-event');const user=userEvent.setup();
  const fetchMock=vi.fn(async()=>({ok:true,json:async()=>({role:'Admin',tickets:[{ticketId:'T',title:'Own request',status:'Approved',history:[{type:'ADVICE',content:'PRIVATE DRAFT',round:0}],description:'My question',responseApproved:true,finalAnswer:'Approved answer',revision:1}]})}));
  vi.stubGlobal('fetch',fetchMock);render(<ConsultationDashboard side="user"/>);
  await user.click(await screen.findByText('Own request'));
  expect(fetchMock).toHaveBeenCalledWith('/api/consultation?side=user',expect.anything());
  expect(screen.getByText('Approved answer')).toBeInTheDocument();
  expect(screen.queryByText('Consultant Dashboard')).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Approve'})).not.toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Edit'})).not.toBeInTheDocument();
  expect(screen.queryByText('PRIVATE DRAFT')).not.toBeInTheDocument();
  await user.click(screen.getByRole('button',{name:'End This Request'}));
  expect(fetchMock).toHaveBeenCalledWith('/api/consultation-reply',expect.objectContaining({body:expect.stringContaining('"action":"close"')}));
 });
});
