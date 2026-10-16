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
  vi.stubGlobal('fetch',fetchMock);render(<ConsultationDashboard/>);
  await user.click(await screen.findByText('Test request'));
  const articles=screen.getAllByRole('article');expect(articles[0]).toHaveTextContent('Original question');
  expect(articles[1]).toHaveTextContent('Proposed response');
  await user.click(screen.getByRole('button',{name:'Approve'}));
  expect(await screen.findByRole('button',{name:'Approved ✓'})).toBeDisabled();
  expect(screen.queryByRole('button',{name:'Edit'})).not.toBeInTheDocument();
  const write=fetchMock.mock.calls.find(call=>call[0]==='/api/consultation-approve');expect(write).toBeDefined();
 });
});
