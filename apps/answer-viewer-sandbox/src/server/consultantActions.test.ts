import { describe, expect, it } from 'vitest';
import { canPublish, validateConsultantAction } from './consultantActions';
describe('consultant action contract', () => {
  it('accepts supported actions with explicit revision', () => {
    for (const action of ['approve','edit','request_clarification'] as const) {
      expect(validateConsultantAction({action,requestId:'r-1',content:'Reviewed answer',expectedRevision:1})?.action).toBe(action);
    }
    expect(validateConsultantAction({action:'reject',requestId:'r-1',expectedRevision:1})).toBeNull();
  });
  it('rejects malformed and ambiguous mutations', () => {
    expect(validateConsultantAction({action:'approve',requestId:'r-1',expectedRevision:1})).toBeNull();
    expect(validateConsultantAction({action:'approve',requestId:'r-1',content:'ok',expectedRevision:-1})).toBeNull();
    expect(validateConsultantAction({action:'publish_anyway',requestId:'r-1',content:'ok',expectedRevision:1})).toBeNull();
  });
  it('never confuses approval with published delivery', () => {
    expect(canPublish('approved')).toBe(false);
    expect(canPublish('delivery_pending')).toBe(false);
    expect(canPublish('delivery_failed')).toBe(false);
    expect(canPublish('published')).toBe(true);
  });
});
