import { useMemo, useState } from 'react';
import type { ConsultationTicket } from '../server/consultationAccess';


const demoTickets: ConsultationTicket[] = [
 {ticketId:'DEMO-001',title:'Leave Policy Consultation',status:'Awaiting Review',history:[{type:'QUESTION',content:'Could you clarify the leave approval process?',round:1},{type:'ADVICE',content:'Review the policy and confirm the applicable approval steps.',round:1}]},
 {ticketId:'DEMO-002',title:'Employee Handbook Review',status:'Approved',history:[{type:'QUESTION',content:'Please review the employee handbook.',round:1}],finalAnswer:'The handbook review is complete.'},
 {ticketId:'DEMO-003',title:'Attendance Policy Update',status:'Editing',history:[{type:'QUESTION',content:'We need to update the attendance policy.',round:1}]},
 {ticketId:'DEMO-004',title:'New Hire Onboarding',status:'Submitted',history:[]}
];
const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const ticketIcons: Record<string, string> = { Submitted: '▤', 'Awaiting Review': '▧', Editing: '✎', Approved: '✓', Failed: '!', 'In Progress': '◷' };
const ticketIcon = (status: string) => ticketIcons[status] ?? '▣';

export function ConsultationDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [tab, setTab] = useState<'Conversation' | 'Details' | 'Files'>('Conversation');

  const tickets = demoTickets;
  const role = 'Admin';
  const visible = useMemo(() => tickets.filter(ticket =>
    (filter === 'All' || ticket.status === filter) &&
    [ticket.ticketId, ticket.title].some(value => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ), [tickets, filter, search]);
  const active = tickets.find(ticket => ticket.ticketId === selected);
  // Derive filter labels from actual ticket statuses; never invent workflow states.
  const filters = ['All', ...Array.from(new Set(tickets.map(ticket => ticket.status).filter(Boolean)))];

  if (!demoMode) return <main className="viewer-shell consultation-dashboard"><section className="consult-welcome"><div className="consult-welcome-mark">P</div><h1>Pocket HR</h1><p>Glide မှာ Login ဝင်ပြီး သင့် Requests ကို ကြည့်ပါ။ Web App က Glide Identity ကို အတည်မပြုနိုင်သေးတဲ့အတွက် Private Data ကို မပြထားပါ။</p><button type="button" className="consult-new" onClick={() => setDemoMode(true)}>Preview Reference UI</button><small>Design preview only · Sample data · No real HR records</small></section></main>;

  return <main className="viewer-shell consultation-dashboard">
    <>
    
    {demoMode && <div className="consult-preview-banner"><span>DESIGN PREVIEW · SAMPLE DATA</span><button type="button" onClick={() => {setDemoMode(false);setSelected(null);}}>Exit Preview</button></div>}
    {active ? <>
        <button type="button" className="consult-back" onClick={() => setSelected(null)} aria-label="Back to requests">‹</button>
        <section className="consult-detail-head">
          <span className={`consult-request-icon tone-${statusClass(active.status)}`} aria-hidden="true">{ticketIcon(active.status)}</span>
          <div className="consult-detail-title"><small>{active.ticketId}{active.createdAt ? ` · ${active.createdAt}` : ''}</small><h1>{active.title}</h1>{active.category && <small>{active.category}</small>}</div><span className={`consult-badge tone-${statusClass(active.status)}`}>{active.status}</span>
        </section>
        <nav className="consult-detail-tabs" aria-label="Request details">
          {(['Conversation', 'Details', 'Files'] as const).map(name =>
            <button key={name} type="button" className={tab === name ? 'active' : ''} aria-current={tab === name ? 'page' : undefined} onClick={() => setTab(name)}><span aria-hidden="true">{name === 'Conversation' ? '☏' : name === 'Details' ? '▤' : '♧'}</span> {name}</button>)}
        </nav>
        {tab === 'Conversation' && <section className="consult-timeline"><div className="consult-timeline-heading"><h2>Conversation</h2><span>{active.history.length + Number(!!active.approvedQuestion) + Number(!!active.finalAnswer)} messages</span></div>
          {active.history.length === 0 && !active.approvedQuestion && !active.finalAnswer
            ? <p className="consult-empty">No released conversation entries available.</p> : null}
          {role === 'Admin' && active.history.map((entry, index) =>
            <article className="consult-message" key={index}><div className="consult-message-author"><span className="consult-avatar">{entry.type === 'QUESTION' ? 'U' : 'C'}</span><strong>{entry.type === 'QUESTION' ? 'User' : 'Consultant'}</strong><small>Round {entry.round}</small></div><p>{entry.content}</p></article>)}
          {active.description && <article className="consult-message"><div className="consult-message-author"><span className="consult-avatar">U</span><strong>Request</strong></div><p>{active.description}</p></article>}
          {active.approvedQuestion && <article className="consult-message"><strong>Consultant · Clarification</strong><p>{active.approvedQuestion}</p></article>}
          {active.finalAnswer && <article className="consult-message consult-final"><strong>Final Answer</strong><p>{active.finalAnswer}</p></article>}
        </section>}
        {tab === 'Details' && <section className="state-card consult-details"><h2>Request Details</h2><dl><div><dt>Request ID</dt><dd>{active.ticketId}</dd></div><div><dt>Subject</dt><dd>{active.title}</dd></div><div><dt>Status</dt><dd><span className={`consult-badge tone-${statusClass(active.status)}`}>{active.status}</span></dd></div>{active.category && <div><dt>Category</dt><dd>{active.category}</dd></div>}{active.createdAt && <div><dt>Created</dt><dd>{active.createdAt}</dd></div>}{active.description && <div><dt>Description</dt><dd>{active.description}</dd></div>}{role === 'Admin' && active.reviewStatus && <div><dt>Review Status</dt><dd>{active.reviewStatus}</dd></div>}{role === 'Admin' && active.processingStatus && <div><dt>Processing Status</dt><dd>{active.processingStatus}</dd></div>}{role === 'Admin' && active.artifact?.status && <div><dt>Artifact Status</dt><dd>{active.artifact.status}</dd></div></dl></section>}
        {tab === 'Files' && <section className="state-card consult-files"><div className="consult-file-icon">▤</div>{role === 'Admin' && active.artifact?.title ? <><h2>{active.artifact.title}</h2><p>{[active.artifact.type, active.artifact.format, active.artifact.status].filter(Boolean).join(' · ')}</p></> : <><h2>No files available</h2><p>Only verified, authorized attachments will appear here.</p></>}</section>}
      </> : <>
        <div className="consult-list-heading"><h1>{role === 'Admin' ? 'All Requests' : 'My Requests'}</h1><p>{tickets.length} requests</p></div>
        <div className="consult-toolbar">
          <input aria-label="Search requests" type="search" placeholder="Search requests, subject, or ID..." value={search} onChange={event => setSearch(event.target.value)} />
          <button type="button" className="consult-new" disabled title="Request creation is not connected to a verified backend contract">＋ New Request</button>
        </div>
        <div className="consult-filters" aria-label="Filter requests">
          {filters.map(status => <button type="button" key={status} className={filter === status ? 'active' : ''} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status} ({status === 'All' ? tickets.length : tickets.filter(ticket => ticket.status === status).length})</button>)}
        </div>
        {visible.length === 0 ? <section className="state-card">Request မရှိသေးပါ။</section> :
          <div className="consult-list">{visible.map(ticket => <button type="button" className="consult-request" key={ticket.ticketId} onClick={() => { setSelected(ticket.ticketId); setTab('Conversation'); }}>
            <span className={`consult-request-icon tone-${statusClass(ticket.status)}`} aria-hidden="true">{ticketIcon(ticket.status)}</span>
            <span className="consult-request-copy"><small>{ticket.ticketId}</small><strong>{ticket.title}</strong></span>
            <span className={`consult-badge tone-${statusClass(ticket.status)}`}>{ticket.status}</span><span className="consult-chevron" aria-hidden="true">›</span>
          </button>)}</div>}
      </>}
    </>}
  </main>;
}
