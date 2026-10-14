// One-time bootstrap: ADMIN_EMAIL=... ADMIN_PASSCODE=.... SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/bootstrap-pocket-hr-admin.mjs
// Run locally; never commit credentials or the PIN.
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
const {ADMIN_EMAIL,ADMIN_PASSCODE,SUPABASE_URL,SUPABASE_SERVICE_ROLE_KEY}=process.env;
const email=ADMIN_EMAIL?.trim().toLowerCase();
if(!email||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^\d{4}$/.test(ADMIN_PASSCODE??'')||!SUPABASE_URL||!SUPABASE_SERVICE_ROLE_KEY) throw new Error('Missing or invalid bootstrap environment');
const base=SUPABASE_URL.replace(/\/$/,'')+'/rest/v1/pocket_hr_accounts';
const headers={apikey:SUPABASE_SERVICE_ROLE_KEY,Authorization:'Bearer '+SUPABASE_SERVICE_ROLE_KEY,'Content-Type':'application/json'};
const existing=await fetch(base+'?select=id&email=eq.'+encodeURIComponent(email),{headers});
if(!existing.ok) throw new Error('Cannot inspect account registry');
if((await existing.json()).length) throw new Error('Account already exists; use authenticated admin reset');
const salt=randomBytes(16).toString('hex');
const hash='scrypt:'+salt+':'+scryptSync(ADMIN_PASSCODE,salt,32).toString('hex');
const result=await fetch(base,{method:'POST',headers,body:JSON.stringify({identity_provider:'verified_admin_provisioning',external_subject:randomUUID(),email,role:'Admin',pin_hash:hash,pin_set_at:new Date().toISOString()})});
if(!result.ok) throw new Error('Admin bootstrap failed: HTTP '+result.status);
console.log('Admin account provisioned:',email);
