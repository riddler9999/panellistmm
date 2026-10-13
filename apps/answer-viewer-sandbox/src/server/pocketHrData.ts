import type { TicketRow } from './ticketRow';
import type { ApprovalProof, DeliveryProof } from './deliveryPolicy';

const cfg = () => {
  const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!url || !key) throw new Error('storage_not_configured');
  return {url:url.replace(/\/$/,''),key};
};
export async function db(path:string,method='GET',body?:unknown):Promise<any> {
  const {url,key}=cfg();
  const response=await fetch(url+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});
  if(!response.ok) { const error=new Error('storage_request_failed'); (error as Error & {status?:number}).status=response.status; throw error; }
  return response.json();
}
const query=(s:string)=>encodeURIComponent(s);
export async function readTickets():Promise<TicketRow[]> {
  const id=process.env.POCKET_HR_SHEET_ID;
  const token=process.env.GOOGLE_SHEETS_ACCESS_TOKEN;
  if(!id || !token) throw new Error('sheet_not_configured');
  const url='https://sheets.googleapis.com/v4/spreadsheets/'+encodeURIComponent(id)+'/values/'+encodeURIComponent('Sheet1!A1:AH');
  const response=await fetch(url,{headers:{Authorization:'Bearer '+token},cache:'no-store'});
  if(!response.ok) throw new Error('sheet_read_failed');
  const data=await response.json() as {values?:unknown[][]};
  const [headers,...rows]=data.values??[];
  if(!headers) throw new Error('sheet_headers_missing');
  const keys=headers.map(String);
  for(const key of ['Row ID','Owner_Email','Final_Answer']) if(!keys.includes(key)) throw new Error('sheet_headers_invalid');
  const seen=new Set<string>();
  return rows.map(row=>Object.fromEntries(keys.map((key,index)=>[key,row[index]??''])) as TicketRow).filter(row=>{
    const id=String(row['Row ID']??'').trim();
    if(!id || seen.has(id)) throw new Error('sheet_row_id_invalid_or_duplicate');
    seen.add(id); return true;
  });
}
export async function readProof(requestId:string):Promise<{approval:ApprovalProof|null,delivery:DeliveryProof|null}> {
  const filter='request_id=eq.'+query(requestId)+'&order=revision.desc&limit=1';
  const approvals=await db('pocket_hr_approvals?select=*&'+filter);
  if(approvals.length!==1) return {approval:null,delivery:null};
  const a=approvals[0];
  const deliveries=await db('pocket_hr_deliveries?select=*&request_id=eq.'+query(requestId)+'&revision=eq.'+a.revision+'&limit=1');
  return {approval:{requestId:a.request_id,revision:a.revision,approvedContent:a.approved_content,approvedByAccountId:a.approved_by_account_id,approvedAt:a.approved_at},delivery:deliveries.length===1?{requestId:deliveries[0].request_id,revision:deliveries[0].revision,result:deliveries[0].result,deliveredAt:deliveries[0].delivered_at}:null};
}
export async function acknowledgeDelivery(requestId:string,revision:number):Promise<boolean> {
  // The delivery proof records successful durable publication, not proof that a human opened the page.
  // Idempotent upsert: a retry can repair a failed write without a second approval.
  const path='pocket_hr_deliveries?on_conflict=request_id,revision';
  const {url,key}=cfg();
  const response=await fetch(url+'/rest/v1/'+path,{method:'POST',headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({request_id:requestId,revision,result:'success',delivered_at:new Date().toISOString()}),cache:'no-store'});
  return response.ok;
}
