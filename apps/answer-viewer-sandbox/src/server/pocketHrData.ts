import type { TicketRow } from './ticketRow';
import type { ApprovalProof, DeliveryProof } from './deliveryPolicy';
import { createSign, randomUUID } from 'node:crypto';

const config = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('storage_not_configured');
  return { url: url.replace(/\/$/, ''), key };
};
export async function db<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
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
/** Only log allowlisted machine codes, never upstream messages, credentials or rows. */
async function googleFailure(response: Response, stage: string): Promise<never> {
  const body = await response.json().catch(() => ({})) as { error?: { status?: string; errors?: Array<{reason?: string}>; details?: Array<{reason?: string}> } | string };
  const error = typeof body.error === 'object' ? body.error : undefined;
  const allowed = new Set(['SERVICE_DISABLED', 'ACCESS_TOKEN_SCOPE_INSUFFICIENT', 'PERMISSION_DENIED', 'NOT_FOUND', 'INVALID_ARGUMENT', 'accessNotConfigured', 'forbidden', 'invalid_grant', 'invalid_client']);
  const candidates = [typeof body.error === 'string' ? body.error : '', error?.status, ...(error?.errors ?? []).map(e => e.reason), ...(error?.details ?? []).map(e => e.reason)];
  console.error('pocket_hr_google_failure', {stage, status: response.status, reasons: candidates.filter((v): v is string => !!v && allowed.has(v))});
  throw new Error(stage);
}
export async function googleAccessToken(): Promise<string> {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('sheet_identity_not_configured');
  if (!/^[^\s@]+@[^\s@]+\.iam\.gserviceaccount\.com$/.test(email)) throw new Error('sheet_identity_invalid');
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64url(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/spreadsheets',
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
  if (!response.ok) return googleFailure(response, 'sheet_token_unavailable');
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new Error('sheet_token_missing');
  return result.access_token;
}
/** Admin-managed PIN register. Never expose its rows to the browser. */
export async function readPasscodeAccounts(): Promise<Array<{email:string;role:string;passcode:string;status:string;sheetRow:number}>> {
 const id = process.env.POCKET_HR_SHEET_ID;
 if (!id) throw new Error('sheet_not_configured');
 const token = await googleAccessToken();
 const url = 'https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id)
  + '/values/' + encodeURIComponent("'Pocket HR PINs'!A1:D1001");
 const response = await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
 if (!response.ok) return googleFailure(response, 'pin_sheet_unavailable');
 const values = (await response.json() as {values?:unknown[][]}).values ?? [];
 const [header,...rows] = values;
 if (!header || ['Email','Role','Passcode','Status'].some((v,i)=>header[i]!==v)) throw new Error('pin_sheet_headers_invalid');
 return rows.map((row,index)=>({sheetRow:index+2,
  email:String(row[0]??'').trim().toLowerCase(),role:String(row[1]??'').trim(),
  passcode:String(row[2]??'').trim(),status:String(row[3]??'').trim(),
 })).filter(row=>row.email.length>0);
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
  return rows.map((row, index) => ({ ...Object.fromEntries(keys.map((key, column) => [key, row[column] ?? ''])), __sheetRow: index + 2 }) as TicketRow)
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
  if (ids.length > 200) throw new Error('proof_batch_too_large');
  const proofs = new Map<string, { approval: ApprovalProof | null; delivery: DeliveryProof | null }>();
  if (ids.length === 0) return proofs;
  const inFilter = ids.map(id => '"' + id.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',');
  const approvals = await db<Array<{
    request_id: string; revision: number; approved_content: string;
    approved_by_account_id: string; approved_at: string;
  }>>('pocket_hr_approvals?select=*&request_id=in.(' + query(inFilter) + ')&order=revision.desc&limit=10000');
  for (const a of approvals) {
    if (!ids.includes(a.request_id) || proofs.has(a.request_id)) continue;
    proofs.set(a.request_id, {
      approval: { requestId: a.request_id, revision: a.revision, approvedContent: a.approved_content, approvedByAccountId: a.approved_by_account_id, approvedAt: a.approved_at },
      delivery: null,
    });
  }
  if (proofs.size === 0) return proofs;
  const deliveries = await db<Array<{
    request_id: string; revision: number; result: DeliveryProof['result']; delivered_at: string | null;
  }>>('pocket_hr_deliveries?select=*&request_id=in.(' + query(inFilter) + ')&limit=10000');
  for (const d of deliveries) {
    const proof = proofs.get(d.request_id);
    if (!proof || proof.approval?.revision !== d.revision) continue;
    proof.delivery = { requestId: d.request_id, revision: d.revision, result: d.result, deliveredAt: d.delivered_at };
  }
  return proofs;
}

/** Update known Sheet1 columns by their verified row index. Never accept row numbers from the browser. */
export async function writeTicketPublication(requestId: string, updates: Record<'C'|'H'|'Y', string> | Partial<Record<'C'|'H'|'Y',string>>): Promise<void> {
 const id = process.env.POCKET_HR_SHEET_ID;
 if (!id) throw new Error('sheet_not_configured');
 const rows = await readTickets();
 const ticket = rows.find(row => String(row['Row ID']).trim() === requestId);
 if (!ticket || !Number.isSafeInteger(ticket.__sheetRow)) throw new Error('ticket_not_found');
 const row = ticket.__sheetRow as number;
 const token = await googleAccessToken();
 const data = Object.entries(updates).map(([column, value]) => ({
  range: 'Sheet1!' + column + row, majorDimension: 'ROWS', values: [[value]]
 }));
 const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets/' + encodeURIComponent(id) + '/values:batchUpdate', {
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({valueInputOption:'RAW',data}),cache:'no-store'
 });
 if(!response.ok) throw new Error('sheet_write_failed');
}

/** Manage exactly the four verified PIN registry columns; never expose rows to clients. */
export async function writePasscodeAccount(action:'create'|'reset'|'disable', email:string, pin?:string, role?:string):Promise<void> {
 const id=process.env.POCKET_HR_SHEET_ID;
 if(!id) throw new Error('sheet_not_configured');
 const accounts=await readPasscodeAccounts();
 const matched=accounts.filter(a=>a.email===email);
 if(matched.length>1) throw new Error('duplicate_account');
 if(action==='create' && matched.length) throw new Error('account_exists');
 if(action!=='create' && matched.length!==1) throw new Error('account_not_found');
 if(action!=='disable') {
  if(!pin || !/^\d{4}$/.test(pin)) throw new Error('invalid_pin');
  if(accounts.some(a=>a.passcode===pin && a.email!==email)) throw new Error('pin_collision');
 }
 const token=await googleAccessToken();
 const base='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/';
 let url:string;let body:unknown;
 if(action==='create') {
  url=base+encodeURIComponent("'Pocket HR PINs'!A:D")+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
  body={values:[[email,role,pin,'Active']]};
 } else {
  const cell=(action==='disable'?'D':'C')+matched[0].sheetRow;
  url=base+encodeURIComponent("'Pocket HR PINs'!"+cell)+'?valueInputOption=RAW';
  body={values:[[action==='disable'?'Disabled':pin]]};
 }
 const response=await fetch(url,{
  method:action==='create'?'POST':'PUT',
  headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify(body),cache:'no-store'
 });
 if(!response.ok) throw new Error('pin_sheet_write_failed');
 // Revoke sessions when status or PIN is changed.
 if(action!=='create') { const { invalidateAccountSessions } = await import('./passcodeAuth.js'); await invalidateAccountSessions(email); }
}

/** Append a new request to the existing Sheet1 bridge. Owner is derived from session. */
export async function createSheetRequest(ownerEmail:string,title:string,category:string,description:string):Promise<string>{
 const id=process.env.POCKET_HR_SHEET_ID;
 if(!id) throw new Error('sheet_not_configured');
 const requestId=randomUUID();
 const rows=await readTickets();
 if(rows.some(row=>row['Row ID']===requestId)) throw new Error('request_id_collision');
 const values=Array(34).fill('');
 values[0]=requestId;values[1]=title;values[2]='Submitted';values[3]=category;
 values[4]=description;values[8]=new Date().toISOString();values[31]=ownerEmail;
 values[33]=requestId;
 const token=await googleAccessToken();
 const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent('Sheet1!A:AH')+':append?valueInputOption=RAW&insertDataOption=INSERT_ROWS';
 const response=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({values:[values]}),cache:'no-store'});
 if(!response.ok) throw new Error('sheet_append_failed');
 return requestId;
}
/** Map named canonical columns to Sheet coordinates, never caller-provided coordinates. */
export async function updateSheetRequest(requestId:string,values:Record<string,string>):Promise<void>{
 const allowed=['Ticket_Status','Review_Status','Consultant_Answer','Clarification_Question','Needs_Clarification','Final_Answer'];
 const rows=await readTickets();
 const row=rows.find(item=>String(item['Row ID'])===requestId);
 if(!row || !Number.isSafeInteger(row.__sheetRow)) throw new Error('ticket_not_found');
 const id=process.env.POCKET_HR_SHEET_ID;
 if(!id) throw new Error('sheet_not_configured');
 const headers=['Row ID','Ticket_Title','Ticket_Status','Ticket_Category','Request_Text','AI_Answer','Consultant_Answer','Final_Answer','Created_At','Subject','HR Issue','Description','File','Unified_Status','Requested_Capabilities','Needs_Clarification','Clarification_Question','Artifact_Type','Artifact_File_Name','Artifact_Download_URL','Artifact_Editor_URL','Unified_Reason_Code','Sheet_AI_Answer','AI_Draft','Review_Status','Processing_Status','Artifact_Title','Artifact_URL','Artifact_Format','Artifact_Status','Processing_Error','Owner_Email','Admin_Role','🔒 Row ID'];
 const data=Object.entries(values).map(([name,value])=>{
  if(!allowed.includes(name)) throw new Error('invalid_column');
  const index=headers.indexOf(name);
  const column=String.fromCharCode(65+index);
  return {range:'Sheet1!'+column+row.__sheetRow,values:[[value]]};
 });
 const token=await googleAccessToken();
 const response=await fetch('https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values:batchUpdate',{
  method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({valueInputOption:'RAW',data}),cache:'no-store'
 });
 if(!response.ok) throw new Error('sheet_write_failed');
}
