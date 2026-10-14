// One-time bootstrap: ADMIN_EMAIL=... ADMIN_PASSCODE=.... ADMIN_AUTH_USER_ID=... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-pocket-hr-admin.mjs
// Run locally; never commit credentials or the PIN.
import {randomBytes,scryptSync} from 'node:crypto';
const {ADMIN_EMAIL,ADMIN_PASSCODE,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY,ADMIN_AUTH_USER_ID}=process.env;
const email=ADMIN_EMAIL?.trim().toLowerCase();
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{4}$/.test(ADMIN_PASSCODE??'')||!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY||!/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(ADMIN_AUTH_USER_ID??'')) throw new Error('Missing or invalid bootstrap environment');
const base=SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/pocket_hr_accounts';
const headers={apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
const existing=await fetch(base+'?select=id&email=eq.'+encodeURIComponent(email),{headers});
if(!existing.ok) throw new Error('Cannot inspect account registry');
if((await existing.json()).length) throw new Error('Account already exists; use authenticated admin reset');
const salt=randomBytes(16).toString('hex');
const hash='scrypt:'+salt+':'+scryptSync(ADMIN_PASSCODE,salt,32).toString('hex');
const result=await fetch(SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/rpc/pocket_hr_provision_verified_account',{method:'POST',headers,body:JSON.stringify({p_subject:ADMIN_AUTH_USER_ID,p_email:email,p_role:'Admin',p_pin_hash:hash})});
if(!result.ok) throw new Error('Admin bootstrap failed: HTTP '+result.status);
console.log('Admin account provisioned:',email);
