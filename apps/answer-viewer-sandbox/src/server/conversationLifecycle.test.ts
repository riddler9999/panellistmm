import { describe,it,expect } from 'vitest';
import { shouldAutoClose, AUTO_CLOSE_MS } from './conversationLifecycle';
describe('48-hour inactivity deadline',()=>{
 const timestamp='2026-10-16T00:00:00Z';
 const start=Date.parse(timestamp);
 it('closes at exactly 48 hours, never before',()=>{
  expect(shouldAutoClose(timestamp,start+AUTO_CLOSE_MS-1)).toBe(false);
  expect(shouldAutoClose(timestamp,start+AUTO_CLOSE_MS)).toBe(true);
 });
 it('does not close on absent, malformed or future timestamps',()=>{
  for(const value of [undefined,null,'invalid','2027-01-01T00:00:00Z']) expect(shouldAutoClose(value,start)).toBe(false);
 });
});
