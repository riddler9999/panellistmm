import { randomBytes, createHash } from 'node:crypto';
import { readPasscodeAccounts } from './pocketHrData.js';
import { redisCommand, allowAttempt } from './pocketHrRedis.js';
import type { Principal } from './consultationAccess.js';

async function loginStage<T>(stage:string,operation:()=>Promise<T>):Promise<T>{
 try{return await operation();}catch(error){
  const cause=error instanceof Error && /^(sheet_identity_not_configured|sheet_not_configured|sheet_token_unavailable|sheet_token_missing|pin_sheet_unavailable|pin_sheet_headers_invalid)$/.test(error.message) ? error.message : error instanceof Error ? error.name : 'unknown';
  console.error('pocket_hr_login_stage_failed',{stage,cause});
  // Raw upstream errors can contain credentials. Preserve only the safe category.
  throw new Error('login_stage_'+stage, {cause: new Error(cause)});
 }
}

const digest = (token: string) => createHash('sha256').update(token).digest('hex');

export function sessionCookie(token: string, maxAge = 2592000): string {
 return 'pocket_hr_session=' + token + '; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=' + maxAge;
}
export function clearSessionCookie(): string { return 'pocket_hr_session=; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=0'; }
export function cookieToken(headers: Record<string,string|string[]|undefined>): string | null {
 const cookie = headers.cookie;
 const raw = Array.isArray(cookie) ? cookie.join(';') : cookie ?? '';
 const token = raw.match(/(?:^|;\s*)pocket_hr_session=([0-9a-f]{64})(?:;|$)/)?.[1];
 return token ?? null;
}
export async function authenticate(pin: string, source = 'unknown'): Promise<string|null> {
 if (!/^\d{4}$/.test(pin)) return null;
 // Google Sheets is the authoritative source for active PINs and roles.
 const sourceKey = digest('source:' + source);
 const sourceAllowed = await loginStage('source_limit',()=>allowAttempt('phr:limit:'+sourceKey,30,900));
 if (sourceAllowed !== true) return null;
 const entries = await loginStage('sheet_accounts',()=>readPasscodeAccounts());
 const matching = entries.filter(entry => entry.passcode === pin);
 if (matching.length === 1) {
  const accountAllowed = await loginStage('account_limit',()=>allowAttempt('phr:account:'+digest(matching[0].email),9,900));
  if (accountAllowed !== true) return null;
 }
 // Reject ambiguous PINs rather than choosing a user's account arbitrarily.
 if (matching.length !== 1 || entries.filter(entry => entry.email === matching[0].email).length !== 1) return null;
 const identity = matching[0];
 if (identity.status !== 'Active' || !['Admin','User'].includes(identity.role)) return null;
 const token = randomBytes(32).toString('hex');
 const version = await loginStage('account_version',()=>redisCommand<string|null>(['GET','phr:version:'+digest(identity.email)]));
 await loginStage('session_write',()=>redisCommand(['SET','phr:session:'+digest(token),JSON.stringify({email:identity.email,version:version??'0'}),'EX',2592000]));
 return token;
}
export async function authenticatedPrincipal(headers: Record<string,string|string[]|undefined>): Promise<Principal|null> {
 const token = cookieToken(headers);
 if (!token) return null;
 const raw = await redisCommand<string|null>(['GET','phr:session:'+digest(token)]);
 if (!raw) return null;
 let session:{email:string;version:string};
 try { session=JSON.parse(raw); } catch { return null; }
 if (!session.email || typeof session.version !== 'string') return null;
 const email = session.email.trim().toLowerCase();
 const currentVersion = await redisCommand<string|null>(['GET','phr:version:'+digest(email)]);
 if (session.version !== (currentVersion??'0')) return null;
 const entries = await readPasscodeAccounts();
 const matches = entries.filter(entry => entry.email === email);
 if (matches.length !== 1 || matches[0].status !== 'Active' || !['Admin','User'].includes(matches[0].role)) return null;
 return { email, role: matches[0].role as Principal['role'] };
}
export async function revokeSession(headers: Record<string,string|string[]|undefined>): Promise<void> {
 const token = cookieToken(headers);
 if (token) await redisCommand(['DEL','phr:session:'+digest(token)]);
}

/** Invalidate all existing account sessions after a PIN reset or disable. */
export async function invalidateAccountSessions(email:string):Promise<void>{
 await redisCommand(['INCR','phr:version:'+digest(email.trim().toLowerCase())]);
}
