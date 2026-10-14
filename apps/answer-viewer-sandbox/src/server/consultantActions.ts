export const CONSULTANT_ACTIONS = ['approve', 'edit', 'request_clarification', 'reject'] as const;
export type ConsultantAction = typeof CONSULTANT_ACTIONS[number];
export type ActionInput = { action: ConsultantAction; requestId: string; content?: string; expectedRevision: number };
export type ActionState = 'draft' | 'approved' | 'delivery_pending' | 'published' | 'delivery_failed' | 'rejected';
export type ActionResult = { requestId: string; revision: number; state: ActionState };
/** Pure contract validation; execution requires verified consultant authorization and persistent transaction. */
export function validateConsultantAction(input: unknown): ActionInput | null {
  if (!input || typeof input !== 'object') return null;
  const v = input as Record<string, unknown>;
  if (!CONSULTANT_ACTIONS.includes(v.action as ConsultantAction)) return null;
  if (typeof v.requestId !== 'string' || !v.requestId.trim() || v.requestId.length > 256) return null;
  if (!Number.isSafeInteger(v.expectedRevision) || (v.expectedRevision as number) < 0) return null;
  if (v.action !== 'reject' && (typeof v.content !== 'string' || !v.content.trim() || v.content.length > 50000)) return null;
  return { action: v.action as ConsultantAction, requestId: v.requestId.trim(), expectedRevision: v.expectedRevision as number, ...(typeof v.content === 'string' ? {content: v.content.trim()} : {}) };
}
export function canPublish(state: ActionState): boolean { return state === 'published'; }
