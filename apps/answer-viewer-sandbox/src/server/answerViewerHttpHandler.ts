import { getAuthorizedAnswer } from './getAuthorizedAnswer';
import { answerJsonResponse, unavailableJsonResponse } from './httpResponse';
import type { ViewerLogger } from './observability';
import type { TicketRepository } from './ticketRepository';

export async function handleAnswerViewerHttpRequest(args: {
  authorization?: string;
  now: number;
  secret: string;
  repository: TicketRepository;
  logger?: ViewerLogger;
}) {
  const match = /^Bearer\s+(.+)$/i.exec(args.authorization?.trim() ?? '');
  if (!match) return unavailableJsonResponse();

  const result = await getAuthorizedAnswer({
    token: match[1],
    now: args.now,
    secret: args.secret,
    repository: args.repository,
    logger: args.logger,
  });
  return result.ok ? answerJsonResponse(result.answer) : unavailableJsonResponse();
}
