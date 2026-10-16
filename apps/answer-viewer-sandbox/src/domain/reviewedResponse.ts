export type ResponseAttachment = { id:string; name:string; mime:string; size:number };
export type ReviewedResponse = { text:string; options:string[]; attachments:ResponseAttachment[] };
const marker='POCKET_HR_RESPONSE_V1\n';
export function validateOptions(value:unknown): string[] | null {
 if(value===undefined)return [];
 if(!Array.isArray(value)||value.length>8)return null;
 if(!value.every(v=>typeof v==='string'&&v.trim().length>0&&v.trim().length<=300))return null;
 const options=value.map(v=>(v as string).trim());
 return new Set(options).size===options.length ? options : null;
}
/** Backward-compatible immutable snapshot; no arbitrary URL or executable content. */
export function encodeResponse(response:ReviewedResponse):string {
 if(!response.options.length&&!response.attachments.length&&!response.text.startsWith(marker))return response.text;
 return marker+JSON.stringify(response);
}
export function decodeResponse(content:string):ReviewedResponse {
 const plain={text:content,options:[],attachments:[]};
 if(!content.startsWith(marker))return plain;
 try {
  const value=JSON.parse(content.slice(marker.length));
  const options=validateOptions(value.options);
  if(typeof value.text!=='string'||!options||!Array.isArray(value.attachments)||value.attachments.length>5)return plain;
  if(!value.attachments.every((a:ResponseAttachment)=>a&&/^[0-9a-f-]{36}$/.test(a.id)&&typeof a.name==='string'&&typeof a.mime==='string'&&Number.isSafeInteger(a.size)))return plain;
  return {text:value.text,options,attachments:value.attachments};
 }catch{return plain;}
}
/** n8n may place this explicit JSON contract in Clarification_Question or AI_Answer. */
export function parseDraftResponse(content:string):ReviewedResponse {
 try {
  const value=JSON.parse(content);
  const options=validateOptions(value.options);
  if(value.kind==='clarification'&&typeof value.question==='string'&&value.question.trim()&&options)
   return {text:value.question.trim(),options,attachments:[]};
 }catch { /* Existing plain-text advice and questions remain supported. */ }
 return {text:content,options:[],attachments:[]};
}
