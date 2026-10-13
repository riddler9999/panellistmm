import { useEffect, useState } from 'react';
import type { ConsultationTicket } from '../server/consultationAccess';

type DashboardResponse = { role: 'Admin' | 'User'; tickets: ConsultationTicket[] };
export function ConsultationDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/consultation', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('access denied'); return response.json() as Promise<DashboardResponse>; })
      .then(setData).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, []);
  return <main className="viewer-shell consultation-dashboard">
    <header><div className="brand">Pocket HR Partner</div><h1>HR Consultation</h1></header>
    {error ? <section className="state-card" role="alert"><strong>Access Denied</strong><p>Glide Login ကို backend က အတည်မပြုနိုင်သေးပါ။ လုံခြုံရေးအတွက် Ticket တွေကို မပြထားပါ။</p></section>
      : !data ? <section className="state-card">Loading consultations…</section>
      : <><p className="dashboard-caption">{data.role === 'Admin' ? 'Consultant Dashboard — All Tickets' : 'My Tickets'}</p>
        {data.tickets.length === 0 ? <section className="state-card">လက်ရှိ Ticket မရှိသေးပါ။</section> : <div className="consultation-grid">{data.tickets.map(ticket =>
          <article className="answer-card" key={ticket.ticketId}><div className="ticket-heading"><h2>{ticket.title}</h2><span className="status">{ticket.status}</span></div>
            {ticket.approvedQuestion && <p>{ticket.approvedQuestion}</p>}
            {ticket.finalAnswer && <p>{ticket.finalAnswer}</p>}
            {data.role === 'Admin' && ticket.history.map((entry,index)=><p key={index} className="consultant-draft"><strong>AI Draft:</strong> {entry.content}</p>)}
            {['Resolved','Delivered'].includes(ticket.status) && <small>Read-only · New issue အတွက် New Request တင်ပါ။</small>}
          </article>)}</div>}</>}
  </main>;
}
