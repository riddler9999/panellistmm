import { authenticate, sessionCookie } from '../src/server/passcodeAuth.js';
type Req = { method?:string; body?:unknown; headers?:Record<string,string|string[]|undefined> };
type Res = { status(n:number):Res; setHeader(k:string,v:string):void; json(v:unknown):void };
export default async function handler(req:Req,res:Res) {
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST') return res.status(405).json({error:'method_not_allowed'});
 const body = req.body && typeof req.body==='object' ? req.body as Record<string,unknown> : {};
 if(typeof body.passcode!=='string') return res.status(400).json({error:'invalid_input'});
 try {
  const source = String(req.headers?.['x-vercel-forwarded-for'] ?? req.headers?.['x-real-ip'] ?? req.headers?.['x-forwarded-for'] ?? 'unknown').split(',')[0].trim().slice(0,128);
  const token = await authenticate(body.passcode, source);
  if(!token) return res.status(401).json({error:'invalid_credentials'});
  res.setHeader('Set-Cookie',sessionCookie(token));
  return res.status(200).json({ok:true});
 } catch (error) {
  // Keep upstream credentials and user data out of public responses and logs.
  const code = error instanceof Error && /^[a-z_]+$/.test(error.message) ? error.message : 'unexpected_failure';
  console.error('pocket_hr_login_failed', { code });
  return res.status(503).json({error:'auth_unavailable'});
 }
}
