/** Display aliases only; preserve upstream workflow values in storage. */
export function ticketStatus(status: string, role: 'Admin' | 'Consultant' | 'User' = 'Admin'): string {
  const value = status.trim();
  if (role === 'User') {
    if (['Awaiting Review', 'Pending_Review'].includes(value)) return 'Under review';
    if (['Approved', 'Delivered'].includes(value)) return 'Response available';
    if (value === 'Needs Clarification') return 'Your reply needed';
    if (value === 'Failed') return 'Could not process';
  }
  if (value === 'Submitted' || value === 'ဖောင်ပို့ပြီး (Submitted)') return 'Processing';
  if (['Awaiting Review', 'Pending_Review'].includes(value)) return 'Needs approval';
  if (['Approved', 'Delivered'].includes(value)) return 'Waiting for user';
  if (value === 'Needs Clarification') return 'Waiting for user';
  if (['Resolved', 'Closed'].includes(value)) return 'Closed';
  if (value === 'Failed') return 'Processing failed';
  return value || 'Processing';
}
