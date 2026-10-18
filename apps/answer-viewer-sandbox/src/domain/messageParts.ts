export type MessagePart = { type:'text'; value:string } | { type:'link'; value:string };

const urlPattern=/(https:\/\/[^\s]+)/g;

/** Turns reviewed HTTPS URLs into links without interpreting arbitrary HTML. */
export function messageParts(content:string):MessagePart[] {
 return content.split(urlPattern).filter(Boolean).map(value=>{
  if(!value.startsWith('https://'))return {type:'text',value};
  try {
   const url=new URL(value);
   return url.protocol==='https:' ? {type:'link',value} : {type:'text',value};
  } catch { return {type:'text',value}; }
 });
}
