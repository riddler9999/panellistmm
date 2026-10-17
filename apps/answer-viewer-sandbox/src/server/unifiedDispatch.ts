export type UnifiedDispatchInput = {
  requestId: string;
  ownerEmail?: string;
  title?: string;
  category?: string;
  description: string;
};

export async function dispatchUnifiedRequest(input: UnifiedDispatchInput): Promise<void> {
  const rawUrl = process.env.N8N_DISPATCH_WEBHOOK_URL;
  if (!rawUrl) throw new Error('dispatcher_not_configured');
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error('dispatcher_not_configured'); }
  if (url.protocol !== 'https:') throw new Error('dispatcher_not_configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      request_id: input.requestId,
      company_id: null,
      user_id: input.ownerEmail?.trim() || null,
      subject: input.title?.trim() || '',
      hr_issue: input.category?.trim() || '',
      description: input.description,
      attachments: [],
      submitted_at: new Date().toISOString(),
      source: 'pocket-hr-web',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('dispatcher_unavailable');
}
