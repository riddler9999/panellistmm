/** Pure guards shared by the Sheet publication and conversation retry paths. */
export function approvalIsCurrent(
  revision: number,
  expectedRevision: number,
  replyRevision: number,
): boolean {
  return Number.isSafeInteger(revision) && revision > 0 &&
    revision === expectedRevision + 1 && replyRevision < revision;
}
export function retryCanResetApprovedFields(
  replyRevision: number,
  approvedRevision: number | null | undefined,
): boolean {
  return Number.isSafeInteger(replyRevision) && replyRevision > 0 &&
    (!approvedRevision || approvedRevision <= replyRevision);
}
