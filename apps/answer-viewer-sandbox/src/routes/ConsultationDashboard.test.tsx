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