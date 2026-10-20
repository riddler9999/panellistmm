export type UnifiedDispatchInput = {
  requestId: string;
  revision: number;
  ownerEmail: string;
  title?: string;
  category?: string;
  description: string;
};

export async function dispatchUnifiedRequest(input: UnifiedDispatchInput): Promise<void> {
  const rawUrl = process.env.N8N_DISPATCH_WEBHOOK_URL;
  const serviceToken = process.env.N8N_DISPATCH_WEBHOOK_SECRET;
  if (!rawUrl) throw new Error('dispatcher_not_configured');
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error('dispatcher_not_configured'); }
  if (url.protocol !== 'https:') throw new Error('dispatcher_not_configured');
  const ownerEmail = input.ownerEmail?.trim().toLowerCase();
  if (!ownerEmail || ownerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    throw new Error('dispatcher_identity_missing');
  if (!serviceToken || serviceToken.length < 32) throw new Error('dispatcher_auth_not_configured');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + serviceToken },
    body: JSON.stringify({
      request_id: input.requestId,
      revision: input.revision,
      company_id: null,
      owner_email: ownerEmail,
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
  // A 202 means n8n accepted the work, not that it created the consultant draft.
  // Callers must independently confirm the pending_review message in Supabase.
  if (response.status !== 200 && response.status !== 202) throw new Error('dispatcher_unavailable');
}
