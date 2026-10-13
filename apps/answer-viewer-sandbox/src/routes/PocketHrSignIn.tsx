import { useState } from 'react';
import type { FormEvent } from 'react';

const AUTH_URL = 'https://apnvkmwcmfpkkifzmdfc.supabase.co';
const PUBLIC_KEY = 'sb_publishable_M2bmH5okBKt0oOSxlurIDA_IW40ak80';
type Stage = 'email' | 'otp' | 'pin';

export function PocketHrSignIn({ onSuccess }: { onSuccess: () => void }) {
  const [stage, setStage] = useState<Stage>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function sendOtp() {
    const res = await fetch(AUTH_URL + '/auth/v1/otp', {
      method: 'POST', headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), create_user: false })
    });
    if (!res.ok) throw new Error('OTP မပို့နိုင်ပါ။ Account Access ကို စစ်ဆေးပါ။');
    setStage('otp'); setMessage('Email မှာ ရရှိတဲ့ Verification Code ကို ထည့်ပါ။');
  }
  async function verifyOtp() {
    const res = await fetch(AUTH_URL + '/auth/v1/verify', {
      method: 'POST', headers: { apikey: PUBLIC_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim().toLowerCase(), token: otp, type: 'email' })
    });
    if (!res.ok) throw new Error('Verification Code မှားနေပါသည်။');
    const body = await res.json() as { access_token?: string };
    if (!body.access_token) throw new Error('Identity ကို အတည်မပြုနိုင်ပါ။');
    setAccessToken(body.access_token); setStage('pin'); setMessage('');
  }
  async function login() {
    const res = await fetch('/api/pocket-hr-login', {
      method: 'POST', credentials: 'include',
      headers: { Authorization: 'Bearer ' + accessToken, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    if (!res.ok) throw new Error(res.status === 503 ? 'Authentication Service မရရှိနိုင်ပါ။' : 'PIN သို့မဟုတ် Account Access မမှန်ပါ။');
    setAccessToken(''); setPin(''); onSuccess();
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('');
    try {
      if (stage === 'email') await sendOtp();
      if (stage === 'otp') await verifyOtp();
      if (stage === 'pin') await login();
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Verification မအောင်မြင်ပါ။'); }
    finally { setBusy(false); }
  }
  return <main className="viewer-shell pocket-hr-auth">
    <section className="state-card">
      <h1>Account Verification</h1>
      <p>{stage === 'email' ? 'ပထမအကြိမ်မှာ Email ကို အတည်ပြုပါ။' : stage === 'otp' ? 'Email Verification' : 'သင့် 4-digit PIN ကို ထည့်ပါ။'}</p>
      <form onSubmit={submit}>
        {stage === 'email' && <label>Email<input type="email" autoComplete="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>}
        {stage === 'otp' && <label>Verification Code<input inputMode="numeric" autoComplete="one-time-code" required value={otp} onChange={e => setOtp(e.target.value)} /></label>}
        {stage === 'pin' && <label>4-digit PIN<input type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} autoComplete="off" required value={pin} onChange={e => setPin(e.target.value)} /></label>}
        <button type="submit" disabled={busy}>{busy ? 'Checking…' : stage === 'email' ? 'Send Code' : stage === 'otp' ? 'Verify Email' : 'Verify PIN'}</button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  </main>;
}
