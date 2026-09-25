import { handleAnswerViewerHttpRequest } from '../src/server/answerViewerHttpHandler';
import { readAnswerViewerServerEnv } from '../src/server/env';
import { GoogleSheetTicketRepository } from '../src/server/googleSheetTicketRepository';
import { HttpTicketTransport } from '../src/server/httpTicketTransport';
import type { ViewerLogger } from '../src/server/observability';

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
};

type ResponseLike = {
  status(code: number): ResponseLike;
  setHeader(name: string, value: string): void;
  json(body: unknown): void;
};

const logger: ViewerLogger = {
  event(name, metadata) {
    console.info(JSON.stringify({ event: name, ...(metadata ?? {}) }));
  },
};

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: RequestLike, res: ResponseLike) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'method_not_allowed' });
    return;
  }

  try {
    const env = readAnswerViewerServerEnv(process.env);
    if (!env.PANELLIST_TICKETS_ENDPOINT || !env.PANELLIST_TICKETS_AUTH_TOKEN) {
      throw new Error('ticket source unavailable');
    }

    const repository = new GoogleSheetTicketRepository(
      new HttpTicketTransport(env.PANELLIST_TICKETS_ENDPOINT, env.PANELLIST_TICKETS_AUTH_TOKEN),
    );
    const response = await handleAnswerViewerHttpRequest({
      authorization: firstHeader(req.headers.authorization),
      now: Math.floor(Date.now() / 1000),
      secret: env.ANSWER_VIEWER_SIGNING_SECRET,
      repository,
      logger,
    });

    for (const [name, value] of Object.entries(response.headers)) res.setHeader(name, value);
    res.status(response.status).json(response.body);
  } catch {
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.status(503).json({ error: 'answer_unavailable' });
  }
}
