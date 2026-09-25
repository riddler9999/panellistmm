const protectedHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
} as const;

export function answerJsonResponse(body: unknown) {
  return { status: 200, headers: protectedHeaders, body };
}

export function unavailableJsonResponse() {
  return { status: 404, headers: protectedHeaders, body: { error: 'answer_unavailable' } };
}
