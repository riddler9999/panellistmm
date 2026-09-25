import type { HRAnswer } from '../domain/hrAnswer';

export async function fetchProductionAnswer(token: string, signal?: AbortSignal): Promise<HRAnswer | null> {
  const response = await fetch(`/api/answer-viewer/${encodeURIComponent(token)}`, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    signal,
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) return null;
  return await response.json() as HRAnswer;
}
