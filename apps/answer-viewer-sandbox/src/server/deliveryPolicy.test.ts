import { describe, expect, it } from 'vitest';
import { deliveryKey, releasedAnswer, type ApprovalProof, type DeliveryProof } from './deliveryPolicy';
const user = { email: 'owner@example.com', role: 'User' as const };
const ticket = { 'Row ID': 'r-1', Owner_Email: 'owner@example.com', Final_Answer: 'mutable sheet value' };
const approval: ApprovalProof = { requestId: 'r-1', revision: 2, approvedContent: 'approved snapshot', approvedByAccountId: 'uuid-1', approvedAt: '2026-10-14T00:00:00Z' };
const delivery: DeliveryProof = { requestId: 'r-1', revision: 2, result: 'success', deliveredAt: '2026-10-14T00:00:01Z' };
describe('immutable approval and delivery release policy', () => {
  it('returns only the approved snapshot with exact successful delivery', () => {
    expect(releasedAnswer(user, ticket, approval, delivery)).toBe('approved snapshot');
    expect(deliveryKey('r-1', 2)).toBe('r-1:2');
  });
  it('blocks cross-user access and ownerless tickets', () => {
    expect(releasedAnswer({email:'other@example.com',role:'User'}, ticket, approval, delivery)).toBeNull();
    expect(releasedAnswer(user, {...ticket, Owner_Email:''}, approval, delivery)).toBeNull();
  });
  it('blocks missing approval or delivery and failed or pending writes', () => {
    expect(releasedAnswer(user, ticket, null, delivery)).toBeNull();
    expect(releasedAnswer(user, ticket, approval, null)).toBeNull();
    expect(releasedAnswer(user, ticket, approval, {...delivery,result:'failed'})).toBeNull();
    expect(releasedAnswer(user, ticket, approval, {...delivery,result:'pending'})).toBeNull();
  });
  it('blocks stale revision, wrong ticket and missing proof metadata', () => {
    expect(releasedAnswer(user, ticket, approval, {...delivery,revision:1})).toBeNull();
    expect(releasedAnswer(user, ticket, {...approval,requestId:'r-2'}, delivery)).toBeNull();
    expect(releasedAnswer(user, ticket, {...approval,approvedByAccountId:''}, delivery)).toBeNull();
    expect(releasedAnswer(user, ticket, approval, {...delivery,deliveredAt:null})).toBeNull();
  });
  it('never treats Sheet status or final answer as proof', () => {
    expect(releasedAnswer(user, {...ticket,Ticket_Status:'Delivered',Review_Status:'Approved'}, null, null)).toBeNull();
  });
});
