import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { unzipSync, strFromU8 } from 'fflate';
import { db } from './pocketHrData.js';
import type { ResponseAttachment } from '../domain/reviewedResponse.js';
export const MAX_ATTACHMENT_BYTES=2*1024*1024;
const bucket='pocket-hr-responses';
export type StoredAttachment=ResponseAttachment & {request_id:string;object_path:string;uploaded_by:string};
function storageConfig(){
 const url=process.env.SUPABASE_URL, key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!key)throw new Error('storage_not_configured');
 return {url:url.replace(/\/$/,''),headers:{apikey:key,Authorization:'Bearer '+key}};
}
export async function validateAttachment(name:unknown,base64:unknown):Promise<{name:string;mime:string;bytes:Buffer}> {
 if(typeof name!=='string'||!name.trim()||name.length>180||(Array.from(name).some(character=>character.charCodeAt(0)<32)||(name.includes('/')||name.includes('\\'))))throw new Error('invalid_file');
 if(typeof base64!=='string'||base64.length>Math.ceil(MAX_ATTACHMENT_BYTES/3)*4||!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64))throw new Error('invalid_file');
 let bytes=Buffer.from(base64,'base64');
 if(!bytes.length||bytes.length>MAX_ATTACHMENT_BYTES)throw new Error('invalid_file');
 let mime:string;
 if(/\.png$/i.test(name)) {
  if(!bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw new Error('invalid_file');
  bytes=await sharp(bytes,{limitInputPixels:16000000,failOn:'warning'}).png().toBuffer();
  mime='image/png';
 }else if(/\.xlsx$/i.test(name)) {
  let size=0, count=0;
  const files=unzipSync(bytes,{filter:entry=>{
   size+=entry.originalSize;count++;
   if(size>20*1024*1024||count>1000||/(^|\/)\.\.(\/|$)/.test(entry.name))throw new Error('invalid_file');
   return true;
  }});
  const types=files['[Content_Types].xml'];
  if(!types||!files['xl/workbook.xml']||!files['_rels/.rels']||!strFromU8(types).includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml')||Object.keys(files).some(path=>/vbaProject|externalLinks|embeddings/i.test(path)))throw new Error('invalid_file');
  mime='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
 }else if(/\.pdf$/i.test(name)) {
  if(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))||!bytes.subarray(-1024).includes(Buffer.from('%%EOF')))throw new Error('invalid_file');
  mime='application/pdf';
 }else throw new Error('invalid_file');
 if(bytes.length>MAX_ATTACHMENT_BYTES)throw new Error('invalid_file');
 return {name:name.trim(),mime,bytes};
}
export async function storeAttachment(requestId:string,email:string,file:Awaited<ReturnType<typeof validateAttachment>>):Promise<ResponseAttachment> {
 const id=randomUUID(), object_path=id;
 const config=storageConfig();
 const response=await fetch(config.url+'/storage/v1/object/'+bucket+'/'+object_path,{
  method:'POST',headers:{...config.headers,'Content-Type':file.mime,'x-upsert':'false'},body:new Uint8Array(file.bytes),
 });
 if(!response.ok)throw new Error('attachment_storage_failed');
 const attachment={id,name:file.name,mime:file.mime,size:file.bytes.length};
 try {
  await db('pocket_hr_response_files','POST',{...attachment,request_id:requestId,object_path,uploaded_by:email});
 } catch (error) {
  // Avoid leaving an unreferenced private Storage object when metadata fails.
  try {
   await fetch(config.url+'/storage/v1/object/'+bucket+'/'+encodeURIComponent(object_path),{
    method:'DELETE',headers:config.headers,
   });
  } catch { /* The original metadata failure remains authoritative. */ }
  throw error;
 }
 return attachment;
}
export async function readAttachment(id:string):Promise<StoredAttachment|null> {
 if(!/^[0-9a-f-]{36}$/.test(id))return null;
 return (await db<StoredAttachment[]>('pocket_hr_response_files?id=eq.'+id))[0]??null;
}
export async function selectAttachments(requestId:string,ids:unknown):Promise<ResponseAttachment[]> {
 if(ids===undefined)return [];
 if(!Array.isArray(ids)||ids.length>5||!ids.every(id=>typeof id==='string')||new Set(ids).size!==ids.length)throw new Error('invalid_attachments');
 const selected:ResponseAttachment[]=[];
 for(const id of ids){
  const file=await readAttachment(id);
  if(!file||file.request_id!==requestId)throw new Error('invalid_attachments');
  selected.push({id:file.id,name:file.name,mime:file.mime,size:file.size});
 }
 return selected;
}
export async function downloadAttachment(file:StoredAttachment):Promise<Buffer> {
 const config=storageConfig();
 const response=await fetch(config.url+'/storage/v1/object/'+bucket+'/'+encodeURIComponent(file.object_path),{headers:config.headers,cache:'no-store'});
 if(!response.ok)throw new Error('attachment_unavailable');
 return Buffer.from(await response.arrayBuffer());
}

// Renderer integration uses the same validation and private Storage path as manual attachments.
// The renderer caller never receives service-role credentials.
export async function storeRenderedPair(requestId:string, files:Array<{name:string;base64:string}>):Promise<ResponseAttachment[]> {
 if(!/^[A-Za-z0-9_-]{1,96}$/.test(requestId)||files.length!==2 ||
    !files.some(f=>/\.xlsx$/i.test(f.name))||!files.some(f=>/\.png$/i.test(f.name)))
   throw new Error('invalid_render_pair');
 const validated=await Promise.all(files.map(f=>validateAttachment(f.name,f.base64)));
 return Promise.all(validated.map(f=>storeAttachment(requestId,'panellist-renderer',f)));
}
