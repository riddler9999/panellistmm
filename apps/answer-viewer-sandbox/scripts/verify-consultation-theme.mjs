import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const base = process.env.UI_BASE_URL || 'http://127.0.0.1:5173';
const output = process.env.UI_EVIDENCE_DIR || '/tmp/panellist-theme-evidence';
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, executablePath: process.env.CHROMIUM_PATH || undefined});
const tickets = [
  {ticketId:'REQ-001',title:'Organization Chart',status:'Approved',description:'အရောင်းဌာန ဖွဲ့စည်းပုံအတွက် အကြံပြုချက် လိုအပ်ပါတယ်။',history:[],responseApproved:true,finalAnswer:'Please include the reporting lines for each team member.',conversation:[{role:'user',content:'We have one manager and two assistants.',revision:1}]},
  {ticketId:'REQ-002',title:'Leave policy review',status:'Awaiting Review',history:[]},
  {ticketId:'REQ-003',title:'Recruitment process',status:'Submitted',history:[]},
  {ticketId:'REQ-004',title:'Employee handbook',status:'Failed',history:[]},
];
function luminance(hex) {
  const raw=hex.trim().replace('#','');
  const normalized=raw.length===3 ? [...raw].map(c=>c+c).join('') : raw;
  const c=normalized.match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return .2126*c[0]+.7152*c[1]+.0722*c[2];
}
function contrast(a,b) {const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
try {
 for(const [width,height] of [[375,812],[768,1024],[1024,768],[1440,1000],[812,375]]) {
  const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
  await page.route('**/api/consultation?side=*',route=>route.fulfill({json:{role:'User',tickets}}));
  await page.goto(base+'/consultation');
  await page.getByText('Organization Chart',{exact:true}).waitFor();
  const tokens=await page.locator('main').evaluate(el=>{
    const css=getComputedStyle(el);
    return Object.fromEntries(['primary','primary-hover','primary-soft','primary-text','surface','subtle','muted','text','secondary','input-border','success','success-soft','warning','warning-soft','danger','danger-soft'].map(key=>[key,css.getPropertyValue('--hr-'+key).trim()]));
  });
  for(const [fg,bg] of [['surface','primary'],['surface','primary-hover'],['primary-text','primary-soft'],['text','surface'],['text','primary-soft'],['secondary','subtle'],['secondary','muted'],['success','success-soft'],['warning','warning-soft'],['danger','danger-soft']]) assert(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg} contrast`);
  assert(contrast(tokens['input-border'],tokens.surface)>=3,'input boundary contrast');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'list overflow');
  await page.screenshot({path:`${output}/requests-${width}.png`,fullPage:true});
  const primaryColor=await page.getByRole('button',{name:'＋ New Request'}).evaluate(el=>getComputedStyle(el).backgroundColor);
  await page.getByRole('button',{name:'＋ New Request'}).click();
  const submit=page.getByRole('button',{name:'Submit Request'});
  assert.equal(await submit.evaluate(el=>getComputedStyle(el).backgroundColor),primaryColor);
  assert((await submit.boundingBox()).height>=44);
  await page.getByLabel('Title',{exact:true}).fill('Team structure');
  await page.getByRole('combobox').selectOption('Organization Chart / Structure');
  await page.getByLabel('Description').fill('Please review the reporting lines.');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  assert(await submit.evaluate(el=>el===document.activeElement),'keyboard reaches submit');
  assert.equal(await submit.evaluate(el=>getComputedStyle(el).outlineStyle),'solid');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'form overflow');
  await page.getByRole('heading',{name:'New Request'}).click();
  await page.screenshot({path:`${output}/new-request-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Cancel',exact:true}).click();
  await page.getByText('Organization Chart',{exact:true}).click();
  const own=await page.locator('.consult-message-own').first().boundingBox();
  const incoming=await page.locator('.consult-message-incoming').first().boundingBox();
  assert(own.x>incoming.x,'user messages on right');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'conversation overflow');
  await page.screenshot({path:`${output}/conversation-${width}.png`,fullPage:true});
  await page.getByRole('button',{name:'Details',exact:true}).click();
  await page.getByRole('heading',{name:'Request Details'}).waitFor();
  await page.getByRole('button',{name:'Files',exact:true}).click();
  await page.getByRole('heading',{name:'No files available'}).waitFor();
  // Larger text must reflow within the page, including filter labels.
  await page.getByRole('button',{name:'Back to requests'}).click();
  await page.addStyleTag({content:'html { font-size: 20px; }'});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'large text overflow');
  console.log(`${width}x${height}: contrast, controls, navigation, layout and larger text PASS`);
  await page.close();
 }
} finally {await browser.close();}
console.log(`Screenshots: ${output}`);
