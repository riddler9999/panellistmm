import { useState } from 'react';
import type { FormEvent } from 'react';

/**
 * Admin-provisioned accounts only. The embedded app must receive a trusted
 * server-verified identity handoff before a PIN can create a session.
 * Never derive identity from a query-string email or an unverified Glide field.
 */
export function PocketHrSignIn({ onSuccess }: { onSuccess: () => void }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^[0-9]{4}$/.test(pin)) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/pocket-hr-login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      if (!response.ok) {
        setMessage(response.status === 503
          ? 'Login Service ကို မရရှိနိုင်သေးပါ။'
          : 'Account identity အတည်ပြုမှု မပြီးသေးပါ။ Admin ကို ဆက်သွယ်ပါ။');
        return;
      }
      setPin('');
      onSuccess();
    } catch {
      setMessage('Login Service ကို မရရှိနိုင်သေးပါ။');
    } finally {
      setBusy(false);
    }
  }
  return <main className="viewer-shell pocket-hr-auth">
    <section className="state-card">
      <h1>Pocket HR</h1>
      <p>Admin သတ်မှတ်ပေးထားသော 4-digit Passcode ကို ထည့်ပါ။</p>
      <form onSubmit={submit}>
        <label>4-digit Passcode
          <input type="password" inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4}
            autoComplete="off" required value={pin}
            onChange={event => setPin(event.target.value.replace(/\D/g, '').slice(0, 4))} />
        </label>
        <button type="submit" disabled={busy || pin.length !== 4}>{busy ? 'Checking…' : 'Continue'}</button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  </main>;
}
