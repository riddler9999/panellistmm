import type { HRAnswer } from '../domain/hrAnswer';
import { projectArtifacts } from './projectArtifacts';
import type { TicketRow } from './ticketRow';

export type ClientVisibleHRAnswer = HRAnswer & { status: 'resolved'; finalAnswer: string };

export type ProjectionPolicy = {
  clientVisibleStatus: string;
};

export const DEFAULT_PROJECTION_POLICY: ProjectionPolicy = {
  clientVisibleStatus: 'Delivered',
};

export function projectClientAnswer(
  row: TicketRow,
  policy: ProjectionPolicy = DEFAULT_PROJECTION_POLICY,
): ClientVisibleHRAnswer | null {
  const status = String(row.Ticket_Status ?? '').trim();
  const finalAnswer = typeof row.Final_Answer === 'string' ? row.Final_Answer.trim() : '';
  if (status !== policy.clientVisibleStatus || !finalAnswer) return null;

  const ticketId = String(row.Ticket_ID ?? row.Row_ID ?? '').trim();
  if (!ticketId) return null;

  const reviewedBy = typeof row.Reviewed_By === 'string' && row.Reviewed_By.trim() ? row.Reviewed_By.trim() : undefined;
  const reviewedAt = typeof row.Reviewed_At === 'string' && row.Reviewed_At.trim() ? row.Reviewed_At.trim() : undefined;
  const updatedAt = typeof row.Updated_At === 'string' && row.Updated_At.trim()
    ? row.Updated_At.trim()
    : reviewedAt ?? new Date(0).toISOString();

  return {
    answerKey: ticketId,
    ticketId,
    title: typeof row.Ticket_Title === 'string' && row.Ticket_Title.trim() ? row.Ticket_Title.trim() : 'HR Answer',
    status: 'resolved',
    finalAnswer,
    artifacts: projectArtifacts(row),
    ...(reviewedBy ? { reviewedBy } : {}),
    ...(reviewedAt ? { reviewedAt } : {}),
    updatedAt,
  };
}
