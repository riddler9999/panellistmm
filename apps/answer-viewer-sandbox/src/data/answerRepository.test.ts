import { describe, expect, it } from 'vitest';
import { getSandboxAnswer, isValidSandboxAnswerKey } from './answerRepository';
import { FIXTURE_KEYS } from './answerFixtures';

describe('sandbox answer repository',()=>{
 it('validates opaque keys and rejects predictable/invalid keys',()=>{ expect(isValidSandboxAnswerKey(FIXTURE_KEYS.longBurmese)).toBe(true); expect(isValidSandboxAnswerKey('1')).toBe(false); expect(isValidSandboxAnswerKey('phr_sbx_ABC')).toBe(false); });
 it('does exact lookup without fallback',()=>{ expect(getSandboxAnswer(FIXTURE_KEYS.longBurmese)?.ticketId).toBe('ticket-sbx-001'); expect(getSandboxAnswer('phr_sbx_000000000000000000000000')).toBeNull(); });
 it('contains all required fixture states',()=>{ const values=Object.values(FIXTURE_KEYS).map(k=>getSandboxAnswer(k)); expect(values.every(Boolean)).toBe(true); expect(values.some(v=>v?.status==='pending_review' && v.finalAnswer)).toBe(true); expect(values.some(v=>v?.status==='expired' && v.finalAnswer)).toBe(true); expect(values.some(v=>v?.artifacts.length===0)).toBe(true); expect(values.some(v=>(v?.artifacts.length??0)>1)).toBe(true); expect(values.some(v=>v?.finalAnswer?.includes('<script>'))).toBe(true); });
});
