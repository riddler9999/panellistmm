import { describe,it,expect } from 'vitest';
import { validatePinPolicy, assessSheetMutation } from './releaseSafety';
describe('production release safety gates',()=>{
 it('rejects a 4 digit PIN as a sole authentication factor',()=>{
  expect(validatePinPolicy({digits:4,requiresIndependentIdentity:false})).toBe(false);
 });
 it('requires atomic row revision checks for Sheet writes',()=>{
  expect(assessSheetMutation({expectedRevision:1,actualRevision:2,rowIdMatches:true})).toBe('conflict');
  expect(assessSheetMutation({expectedRevision:1,actualRevision:1,rowIdMatches:false})).toBe('row_moved');
  expect(assessSheetMutation({expectedRevision:1,actualRevision:1,rowIdMatches:true})).toBe('ok');
 });
});
