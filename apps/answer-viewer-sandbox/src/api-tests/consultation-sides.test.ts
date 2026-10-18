import {beforeEach,describe,it,expect,vi} from 'vitest';
import handler from '../../api/consultation';
import {authenticatedPrincipal} from '../server/passcodeAuth';
import {loadLiveConsultations} from '../server/liveConsultation';
vi.mock('../server/passcodeAuth',()=>({authenticatedPrincipal:vi.fn()}));
vi.mock('../server/liveConsultation',()=>({loadLiveConsultations:vi.fn()}));
const res=()=>{let status=200;let body:unknown;const r={status(n:number){status=n;return r;},setHeader(){},json(v:unknown){body=v;}};return {r,result:()=>({status,body})};};
describe('separate embed API projections',()=>{
 beforeEach(()=>{vi.resetAllMocks();vi.mocked(loadLiveConsultations).mockResolvedValue([]);});
 it('downgrades admin to owner-only User projection on My Requests',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'admin@example.com',role:'Admin'});
  const {r,result}=res();await handler({method:'GET',headers:{},query:{side:'user'}},r);
  expect(loadLiveConsultations).toHaveBeenCalledWith({email:'admin@example.com',role:'User'});
  expect(result().body).toEqual({role:'User',tickets:[]});
 });
 it('denies User visiting admin URL before loading tickets',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'user@example.com',role:'User'});
  const {r,result}=res();await handler({method:'GET',headers:{},query:{side:'admin'}},r);
  expect(result().status).toBe(403);expect(loadLiveConsultations).not.toHaveBeenCalled();
 });
 it('allows verified Admin on All Requests',async()=>{
  vi.mocked(authenticatedPrincipal).mockResolvedValue({email:'admin@example.com',role:'Admin'});
  const {r,result}=res();await handler({method:'GET',headers:{},query:{side:'admin'}},r);
  expect(result().body).toEqual({role:'Admin',tickets:[]});
 });
});
