import { projectClientAnswer, type ClientVisibleHRAnswer } from './projectClientAnswer';
import { noopViewerLogger, type ViewerLogger } from './observability';
import type { TicketRepository } from './ticketRepository';
import { verifyViewerToken } from './viewerToken';

export type AuthorizedAnswerResult =
  | { ok: true; answer: ClientVisibleHRAnswer }
  | { ok: false; reason: 'unavailable' };

export async function getAuthorizedAnswer(args: {
  token: string;
  now: number;
  secret: string;
  repository: TicketRepository;
  logger?: ViewerLogger;
}): Promise<AuthorizedAnswerResult> {
  const logger = args.logger ?? noopViewerLogger;
  const claims = verifyViewerToken({ token: args.token, now: args.now, secret: args.secret });
  if (!claims) {
    logger.event('viewer_token_invalid');
    return { ok: false, reason: 'unavailable' };
  }

  const row = await args.repository.getByTicketId(claims.ticketId);
  if (!row) {
    logger.event('viewer_ticket_not_found', { ticketId: claims.ticketId });
    return { ok: false, reason: 'unavailable' };
  }

  const actualTicketId = String(row.Ticket_ID ?? row.Row_ID ?? '').trim();
  if (actualTicketId !== claims.ticketId) {
    logger.event('viewer_access_denied', { ticketId: claims.ticketId });
    return { ok: false, reason: 'unavailable' };
  }

  const answer = projectClientAnswer(row);
  if (!answer) {
    logger.event('viewer_ticket_not_resolved', { ticketId: claims.ticketId });
    return { ok: false, reason: 'unavailable' };
  }

  logger.event('viewer_access_success', { ticketId: claims.ticketId });
  return { ok: true, answer };
}
