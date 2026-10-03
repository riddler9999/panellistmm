export type AnswerViewerServerEnv = {
  ANSWER_VIEWER_SIGNING_SECRET: string;
  ANSWER_VIEWER_BASE_URL: string;
  PANELLIST_TICKETS_ENDPOINT?: string;
  PANELLIST_TICKETS_AUTH_TOKEN?: string;
};

export function readAnswerViewerServerEnv(source: Record<string, string | undefined>): AnswerViewerServerEnv {
  const secret = source.ANSWER_VIEWER_SIGNING_SECRET?.trim();
  const baseUrl = source.ANSWER_VIEWER_BASE_URL?.trim();
  if (!secret || secret.length < 32) throw new Error('answer viewer server configuration unavailable');
  if (!baseUrl || !/^https:\/\//.test(baseUrl)) throw new Error('answer viewer server configuration unavailable');

  return {
    ANSWER_VIEWER_SIGNING_SECRET: secret,
    ANSWER_VIEWER_BASE_URL: baseUrl.replace(/\/$/, ''),
    PANELLIST_TICKETS_ENDPOINT: source.PANELLIST_TICKETS_ENDPOINT?.trim() || undefined,
    PANELLIST_TICKETS_AUTH_TOKEN: source.PANELLIST_TICKETS_AUTH_TOKEN?.trim() || undefined,
  };
}
