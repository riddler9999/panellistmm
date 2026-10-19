import {describe,it,expect} from 'vitest';
import {approvalIsCurrent,retryCanResetApprovedFields} from './atomicReview';
describe('atomic review invariants',()=>{
 it('rejects stale revision, mismatched revision and already replied cycles',()=>{
  expect(approvalIsCurrent(2,1,0)).toBe(true);
  expect(approvalIsCurrent(2,0,0)).toBe(false);
  expect(approvalIsCurrent(2,1,2)).toBe(false);
 });
 it('prevents old user retry resetting a newly approved answer',()=>{
  expect(retryCanResetApprovedFields(1,2)).toBe(false);
  expect(retryCanResetApprovedFields(1,1)).toBe(true);
  expect(retryCanResetApprovedFields(1,null)).toBe(true);
 });
});
