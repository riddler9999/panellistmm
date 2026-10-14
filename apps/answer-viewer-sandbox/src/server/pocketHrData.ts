import type { TicketRow } from './ticketRow';
import type { ApprovalProof, DeliveryProof } from './deliveryPolicy';
import { createSign } from 'node:crypto';

const config = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('storage_not_configured');
  return { url: url.replace(/\/$/, ''), key };
};
export async function db(path: string, method = 'GET', body?: unknown): Promise<any> {
  const { url, key } = config();
  const response = await fetch(url + '/rest/v1/' + path, {
    method,
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: 'no-store',
  });
  if (!response.ok) {
    const error = new Error('storage_request_failed') as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json();
}
const query = (s: string) => encodeURIComponent(s);
const base64url = (input: string | Buffer) => Buffer.from(input).toString('base64url');
async function googleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('sheet_identity_not_configured');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3000,
  }));
  const unsigned = header + '.' + claims;
  const signer = createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + '.' + signer.sign(privateKey).toString('base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error('sheet_token_unavailable');
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new Error('sheet_token_missing');
  return result.access_token;
}
export async function readTickets(): Promise<TicketRow[]> {
  const id = process.env.POCKET_HR_SHEET_ID;
  if (!id) throw new Error('sheet_not_configured');
  const token = await googleAccessToken();
  const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values/' + encodeURIComponent('Sheet1!A1:AH');
  const response = await fetch(url, { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
  if (!response.ok) throw new Error('sheet_read_failed');
  const data = await response.json() as { values?: unknown[][] };
  const [headers, ...rows] = data.values ?? [];
  if (!headers) throw new Error('sheet_headers_missing');
  const keys = headers.map(String);
  for (const key of ['Row ID', 'Owner_Email', 'Final_Answer']) {
    if (keys.filter(k => k === key).length !== 1) throw new Error('sheet_headers_invalid');
  }
  const seen = new Set<string>();
  return rows.map(row => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ''])) as TicketRow)
    .filter(row => {
      const id = String(row['Row ID'] ?? '').trim();
      if (!id || seen.has(id)) throw new Error('sheet_row_id_invalid_or_duplicate');
      seen.add(id);
      return true;
    });
}
export async function readProof(requestId: string): Promise<{ approval: ApprovalProof | null; delivery: DeliveryProof | null }> {
  const proofs = await readProofs([requestId]);
  return proofs.get(requestId) ?? { approval: null, delivery: null };
}
export async function acknowledgeDelivery(requestId: string, revision: number): Promise<boolean> {
  // Durable publication acknowledgement, NOT proof that the user opened the page.
  // A failed write leaves the approved snapshot inaccessible to users until retry succeeds.
  const { url, key } = config();
  const response = await fetch(url + '/rest/v1/pocket_hr_deliveries?on_conflict=request_id,revision', {
    method: 'POST',
    headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify({ request_id: requestId, revision, result: 'success', delivered_at: new Date().toISOString() }),
    cache: 'no-store',
  });
  return response.ok;
}

/** Read approval/delivery proofs in two bounded queries rather than two queries per ticket.
 * Caller must authorize and bound ticket IDs before invoking this function.
 */
export async function readProofs(requestIds: string[]): Promise<Map<string, { approval: ApprovalProof | null; delivery: DeliveryProof | null }>> {
  const ids = [...new Set(requestIds.map(id => id.trim()).filter(Boolean))];
  if (ids.length > 500) throw new Error('proof_batch_too_large');
  const proofs = new Map<string, { approval: ApprovalProof | null; delivery: DeliveryProof | null }>();
  if (ids.length === 0) return proofs;
  const inFilter = ids.map(id => '"' + id.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',');
  const approvals = await db('pocket_hr_approvals?select=*&request_id=in.(' + query(inFilter) + ')&order=revision.desc&limit=500');
  for (const a of approvals) {
    if (!ids.includes(a.request_id) || proofs.has(a.request_id)) continue;
    proofs.set(a.request_id, {
      approval: { requestId: a.request_id, revision: a.revision, approvedContent: a.approved_content, approvedByAccountId: a.approved_by_account_id, approvedAt: a.approved_at },
      delivery: null,
    });
  }
  if (proofs.size === 0) return proofs;
  const deliveries = await db('pocket_hr_deliveries?select=*&request_id=in.(' + query(inFilter) + ')&limit=500');
  for (const d of deliveries) {
    const proof = proofs.get(d.request_id);
    if (!proof || proof.approval?.revision !== d.revision) continue;
    proof.delivery = { requestId: d.request_id, revision: d.revision, result: d.result, deliveredAt: d.delivered_at };
  }
  return proofs;
}
