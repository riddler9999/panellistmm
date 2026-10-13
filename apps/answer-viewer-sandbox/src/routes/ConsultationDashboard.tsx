import { useEffect, useMemo, useState } from 'react';
import type { ConsultationTicket } from '../server/consultationAccess';
import { PocketHrSignIn } from './PocketHrSignIn';

type DashboardResponse = { role: 'Admin' | 'User'; tickets: ConsultationTicket[] };
const statuses = ['All', 'Submitted', 'Awaiting Review', 'Editing', 'Approved', 'Failed'] as const;

export function ConsultationDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [tab, setTab] = useState<'Conversation' | 'Details' | 'Files'>('Conversation');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/pocket-hr-session', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(res => { if (!res.ok) throw new Error('session unavailable'); setAuthenticated(true); })
      .catch(() => { if (!controller.signal.aborted) setAuthenticated(false); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSession(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const controller = new AbortController();
    fetch('/api/consultation', { credentials: 'include', cache: 'no-store', signal: controller.signal })
      .then(async response => { if (!response.ok) throw new Error('access denied'); return response.json() as Promise<DashboardResponse>; })
      .then(setData).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [authenticated]);


  const tickets = data?.tickets ?? [];
  const visible = useMemo(() => tickets.filter(ticket =>
    (filter === 'All' || ticket.status === filter) &&
    [ticket.ticketId, ticket.title].some(value => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ), [tickets, filter, search]);
  const active = tickets.find(ticket => ticket.ticketId === selected);
  const filters = Array.from(new Set<string>([...statuses, ...tickets.map(ticket => ticket.status).filter(Boolean)]));

  if (loadingSession) return <main className="viewer-shell" role="status">Checking session…</main>;
  if (!authenticated) return <PocketHrSignIn onSuccess={() => { setError(false); setAuthenticated(true); }} />;

  return <main className="viewer-shell consultation-dashboard">
    {error ? <section className="state-card" role="alert"><strong>Access Denied</strong><p>အကောင့်ကို Backend က အတည်မပြုနိုင်သေးပါ။ လုံခြုံရေးအတွက် Request တွေကို မပြထားပါ။</p></section>
      : !data ? <section className="state-card" role="status">Loading consultations…</section>
      : active ? <>
        <button type="button" className="consult-back" onClick={() => setSelected(null)}>← Back to requests</button>
        <section className="consult-detail-head">
          <small>{active.ticketId}</small><h1>{active.title}</h1><span className="consult-badge">{active.status}</span>
        </section>
        <nav className="consult-detail-tabs" aria-label="Request details">
          {(['Conversation', 'Details', 'Files'] as const).map(name =>
            <button key={name} type="button" className={tab === name ? 'active' : ''} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}>{name}</button>)}
        </nav>
        {tab === 'Conversation' && <section className="consult-timeline">
          {active.history.length === 0 && !active.approvedQuestion && !active.finalAnswer
            ? <p className="consult-empty">No released conversation entries available.</p> : null}
          {data.role === 'Admin' && active.history.map((entry, index) =>
            <article className="consult-message" key={index}><strong>Internal assessment · {entry.type}</strong><p>{entry.content}</p></article>)}
          {active.approvedQuestion && <article className="consult-message"><strong>Consultant · Clarification</strong><p>{active.approvedQuestion}</p></article>}
          {active.finalAnswer && <article className="consult-message consult-final"><strong>Final Answer</strong><p>{active.finalAnswer}</p></article>}
        </section>}
        {tab === 'Details' && <section className="state-card consult-details"><p><strong>Request ID</strong> {active.ticketId}</p><p><strong>Subject</strong> {active.title}</p><p><strong>Status</strong> {active.status}</p></section>}
        {tab === 'Files' && <section className="state-card">No authorized files are available from the current API contract.</section>}
      </> : <>
        <div className="consult-toolbar">
          <input aria-label="Search requests" type="search" placeholder="Search requests, subject, or ID..." value={search} onChange={event => setSearch(event.target.value)} />
          <button type="button" className="consult-new" disabled title="Request creation is not connected to a verified backend contract">＋ New Request</button>
        </div>
        <div className="consult-filters" aria-label="Filter requests">
          {filters.map(status => <button type="button" key={status} className={filter === status ? 'active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status} ({status === 'All' ? tickets.length : tickets.filter(ticket => ticket.status === status).length})</button>)}
        </div>
        {visible.length === 0 ? <section className="state-card">Request မရှိသေးပါ။</section> :
          <div className="consult-list">{visible.map(ticket => <button type="button" className="consult-request" key={ticket.ticketId} onClick={() => { setSelected(ticket.ticketId); setTab('Conversation'); }}>
            <span className="consult-request-icon" aria-hidden="true">▤</span>
            <span className="consult-request-copy"><small>{ticket.ticketId}</small><strong>{ticket.title}</strong></span>
            <span className="consult-badge">{ticket.status}</span><span aria-hidden="true">›</span>
          </button>)}</div>}
      </>}
  </main>;
}
