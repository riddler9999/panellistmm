import type { Principal } from './consultationAccess';
import type { TicketRow } from './ticketRow';

export type ApprovalProof = {
  requestId: string;
  revision: number;
  approvedContent: string;
  approvedByAccountId?: string | null;
  approvedByEmail?: string | null;
  approvedAt: string;
};
export type DeliveryProof = {
  requestId: string;
  revision: number;
  result: 'success' | 'failed' | 'pending';
  deliveredAt: string | null;
};

const value = (v: unknown) => typeof v === 'string' ? v.trim() : '';
export const deliveryKey = (requestId: string, revision: number) => requestId + ':' + revision;

/** Pure, fail-closed release check. Proofs must be loaded from trusted server storage. */
export function releasedAnswer(
  principal: Principal,
  ticket: TicketRow,
  approval: ApprovalProof | null,
  delivery: DeliveryProof | null,
): string | null {
  const requestId = value(ticket['Row ID']);
  const owner = value(ticket.Owner_Email).toLowerCase();
  if (!requestId || !owner || (principal.role !== 'Admin' && principal.email.toLowerCase() !== owner)) return null;
  if (!approval || !delivery || approval.requestId !== requestId || delivery.requestId !== requestId) return null;
  if (!Number.isSafeInteger(approval.revision) || approval.revision < 1 || delivery.revision !== approval.revision) return null;
  const hasApprover = !!approval.approvedByAccountId || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value(approval.approvedByEmail));
  if (!hasApprover || !value(approval.approvedAt) || !value(approval.approvedContent)) return null;
  if (delivery.result !== 'success' || !value(delivery.deliveredAt)) return null;
  // A Sheet cell or status alone is never a release authority. The immutable approved snapshot wins.
  return approval.approvedContent;
}
