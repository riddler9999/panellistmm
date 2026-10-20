export type UnifiedDispatchInput = {
  requestId: string;
  revision: number;
  ownerEmail: string;
  title?: string;
  category?: string;
  description: string;
};

export type UnifiedDispatchResult = 'accepted' | 'draft_stored';

export type UnifiedDispatchAcknowledgement = {
  ok: true;
  request_id: string;
  revision: number;
  ai_draft_stored: true;
};

export async function dispatchUnifiedRequest(input: UnifiedDispatchInput): Promise<UnifiedDispatchResult> {
  const rawUrl = process.env.N8N_DISPATCH_WEBHOOK_URL;
  const serviceToken = process.env.N8N_DISPATCH_WEBHOOK_SECRET;
  if (!rawUrl) throw new Error('dispatcher_not_configured');
  if (!serviceToken || serviceToken.trim().length < 32) throw new Error('dispatcher_auth_not_configured');
  let url: URL;
  try { url = new URL(rawUrl); }
  catch { throw new Error('dispatcher_not_configured'); }
  if (url.protocol !== 'https:') throw new Error('dispatcher_not_configured');
  const ownerEmail = input.ownerEmail?.trim().toLowerCase();
  if (!ownerEmail || ownerEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail))
    throw new Error('dispatcher_identity_missing');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + serviceToken },
    body: JSON.stringify({
      request_id: input.requestId,
      revision: input.revision,
      company_id: null,
      user_id: ownerEmail,
      subject: input.title?.trim() || '',
      hr_issue: input.category?.trim() || '',
      description: input.description,
      attachments: [],
      submitted_at: new Date().toISOString(),
      source: 'pocket-hr-web',
    }),
    cache: 'no-store',
    signal: AbortSignal.timeout(50_000),
  });
  // 202 only acknowledges dispatch; every caller checks Supabase before it
  // clears the retryable conversation state.
  if (response.status === 202) return 'accepted';
  if (response.status !== 200) throw new Error('dispatcher_unavailable');
  let acknowledgement: unknown;
  try { acknowledgement = await response.json(); }
  catch { throw new Error('dispatcher_ack_invalid'); }
  const ack = acknowledgement as Partial<UnifiedDispatchAcknowledgement> | null;
  if (!ack || ack.ok !== true || ack.ai_draft_stored !== true ||
      ack.request_id !== input.requestId || ack.revision !== input.revision)
    throw new Error('dispatcher_ack_invalid');
  return 'draft_stored';
}
