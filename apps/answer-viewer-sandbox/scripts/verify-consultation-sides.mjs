import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
await mkdir('browser-evidence',{recursive:true});
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH || undefined});
const file={id:'00000000-0000-4000-8000-000000000001',name:'answer.pdf',mime:'application/pdf',size:20};
for(const width of [390,1280]){
 const page=await browser.newPage({viewport:{width,height:900}});
 let approved=false,closed=false;const calls=[];
 await page.route('**/api/**',async route=>{
  const request=route.request(),url=new URL(request.url());
  if(request.method()==='POST'){
   const body=request.postDataJSON();calls.push({path:url.pathname,body});
   if(url.pathname==='/api/consultation-file')return route.fulfill({json:file,status:201});
   if(url.pathname==='/api/consultation-approve')approved=true;
   if(url.pathname==='/api/consultation-reply'&&body.action==='close')closed=true;
   return route.fulfill({json:{ok:true}});
  }
  const admin=url.searchParams.get('side')==='admin';
  return route.fulfill({json:{role:admin?'Admin':'User',tickets:[{ticketId:'T',title:'Browser request',status:approved?'Approved':'Awaiting Review',description:'Original question',history:admin?[{type:'ADVICE',content:'Draft answer',round:0}]:[],draftVersion:'fingerprint',revision:approved?1:0,responseApproved:approved,closed,finalAnswer:approved?'Reviewed answer':undefined,attachments:approved?[file]:[]}]}});
 });
 await page.goto('http://127.0.0.1:4173/consultation/admin');
 await page.getByText('Browser request',{exact:true}).click();
 await page.getByRole('button',{name:'Edit',exact:true}).click();
 await page.getByLabel('Edit response',{exact:true}).fill('Reviewed answer');
 await page.getByLabel('Attach PNG, Excel').setInputFiles({name:'answer.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%%EOF')});
 await page.getByRole('button',{name:'Remove answer.pdf',exact:true}).waitFor();
 await page.getByRole('button',{name:'Approve',exact:true}).click();
 await page.getByRole('button',{name:'Approved ✓',exact:true}).waitFor();
 const payload=calls.find(c=>c.path==='/api/consultation-approve').body;
 assert.equal(payload.content,'Reviewed answer');assert.deepEqual(payload.attachmentIds,[file.id]);assert.equal(payload.draftVersion,'fingerprint');
 await page.screenshot({path:`browser-evidence/admin-${width}.png`,fullPage:true});
 await page.goto('http://127.0.0.1:4173/consultation/user');
 await page.getByText('Browser request',{exact:true}).click();
 assert.equal(await page.getByText('Consultant Dashboard',{exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Edit',exact:true}).count(),0);
 assert.equal(await page.getByRole('button',{name:'Approve',exact:true}).count(),0);
 await page.getByText('Reviewed answer',{exact:true}).waitFor();
 await page.getByLabel('Follow-up question',{exact:true}).fill('Can you explain more?');
 await page.getByRole('button',{name:'Send follow-up',exact:true}).click();
 await page.getByRole('button',{name:'End This Request',exact:true}).click();
 await page.getByText('Ticket closed',{exact:true}).waitFor();
 assert(calls.some(c=>c.body.action==='reply'&&c.body.content==='Can you explain more?'));
 assert(calls.some(c=>c.body.action==='close'));
 await page.screenshot({path:`browser-evidence/user-${width}.png`,fullPage:true});
 await page.goto('http://127.0.0.1:4173/consultation');await page.waitForURL('**/consultation/user');
 console.log(`PASS ${width}px: admin edit/upload/approve; user answer/follow-up/end; legacy redirect`);
 await page.close();
}
await browser.close();
