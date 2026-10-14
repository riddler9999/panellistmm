import { useEffect, useMemo, useState } from 'react';
import type { ConsultationTicket } from '../server/consultationAccess';


const demoTickets: ConsultationTicket[] = [
 {ticketId:'DEMO-001',title:'Leave Policy Consultation',status:'Awaiting Review',history:[{type:'QUESTION',content:'Could you clarify the leave approval process?',round:1},{type:'ADVICE',content:'Review the policy and confirm the applicable approval steps.',round:1}]},
 {ticketId:'DEMO-002',title:'Employee Handbook Review',status:'Approved',history:[{type:'QUESTION',content:'Please review the employee handbook.',round:1}],finalAnswer:'The handbook review is complete.'},
 {ticketId:'DEMO-003',title:'Attendance Policy Update',status:'ဖောင်ပို့ပြီး (Submitted)',history:[{type:'QUESTION',content:'We need to update the attendance policy.',round:1}]},
 {ticketId:'DEMO-004',title:'New Hire Onboarding',status:'Submitted',history:[]}
];
const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const ticketIcons: Record<string, string> = { Submitted: '▤', 'ဖောင်ပို့ပြီး (Submitted)': '▤', 'Awaiting Review': '▧', Approved: '✓', Failed: '!' };
const ticketIcon = (status: string) => ticketIcons[status] ?? '▣';

export function ConsultationDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [session, setSession] = useState<{role:'Admin'|'User';tickets:ConsultationTicket[]}|null>(null);
  const [checking, setChecking] = useState(true);
  const loginEmail = 'moehtetofficial1@gmail.com'; // Temporary admin-only login until Glide identity handoff is available.
  const [passcode, setPasscode] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  useEffect(() => {
    let active = true;
    fetch('/api/consultation', {credentials:'include',cache:'no-store'})
      .then(async response => {
        if (!response.ok) return null;
        return await response.json() as {role:'Admin'|'User';tickets:ConsultationTicket[]};
      })
      .then(data => {if(active) setSession(data);})
      .catch(() => {if(active) setLoginError('Service unavailable. Please try again.');})
      .finally(() => {if(active) setChecking(false);});
    return () => {active=false;};
  },[]);
  async function login(event: React.FormEvent) {
    event.preventDefault();
    if(loggingIn) return;
    setLoggingIn(true);setLoginError('');
    try {
      const response=await fetch('/api/pocket-hr-login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:loginEmail,passcode})});
      if(!response.ok){setLoginError(response.status===401?'Passcode is incorrect.':'Login unavailable.');return;}
      const ticketsResponse=await fetch('/api/consultation',{credentials:'include',cache:'no-store'});
      if(!ticketsResponse.ok){setLoginError('Could not load requests.');return;}
      setSession(await ticketsResponse.json() as {role:'Admin'|'User';tickets:ConsultationTicket[]});
      setPasscode('');setDemoMode(false);
    }catch{setLoginError('Network error. Try again.');}
    finally{setLoggingIn(false);}
  }
  async function logout() {
    try {await fetch('/api/pocket-hr-session',{method:'POST',credentials:'include'});} catch { /* clear local UI even if offline */ }
    setSession(null);setDemoMode(false);setSelected(null);setPasscode('');
  }
  const [tab, setTab] = useState<'Conversation' | 'Details' | 'Files'>('Conversation');
  const [actionDraft, setActionDraft] = useState('');
  const [actionMode, setActionMode] = useState<'approve' | 'edit' | 'request_clarification' | 'reject' | null>(null);

  const tickets = useMemo(() => demoMode ? demoTickets : (session?.tickets ?? []), [demoMode, session]);
  const role = demoMode ? 'Admin' : (session?.role ?? 'User');
  const visible = useMemo(() => tickets.filter(ticket =>
    (filter === 'All' || ticket.status === filter) &&
    [ticket.ticketId, ticket.title].some(value => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ), [tickets, filter, search]);
  const active = tickets.find(ticket => ticket.ticketId === selected);
  // Derive filter labels from actual ticket statuses; never invent workflow states.
  const filters = ['All', ...Array.from(new Set(tickets.map(ticket => ticket.status).filter(Boolean)))];

  if (!session && !demoMode) return <main className="viewer-shell consultation-dashboard"><section className="consult-welcome"><div className="consult-welcome-mark">P</div><h1>Pocket HR</h1>
    {checking ? <p>Loading...</p> : <form onSubmit={login} className="pocket-hr-pin-form">
      <p>Enter the passcode provided by your administrator.</p>
      <label htmlFor="pocket-hr-pin">4-Digit Passcode</label>
      <input id="pocket-hr-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="current-password" required value={passcode} onChange={event=>setPasscode(event.target.value.replace(/\D/g,'').slice(0,4))}/>
      {loginError && <p role="alert">{loginError}</p>}
      <button type="submit" className="consult-new" disabled={loggingIn}>{loggingIn?'Signing in...':'Open Dashboard'}</button>
    </form>}
    <button type="button" className="pocket-hr-preview" onClick={()=>setDemoMode(true)}>Preview Reference UI</button><small>Preview uses sample data only.</small>
    </section></main>;

  return <main className="viewer-shell consultation-dashboard">
    
    {session && !demoMode && <div className="consult-preview-banner"><span>{role === 'Admin' ? 'Consultant Dashboard' : 'My Requests'}</span><button type="button" onClick={logout}>Log out</button></div>}
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
        {role === 'Admin' && <section className="state-card consult-actions" aria-label="Consultant actions">
          <h2>Consultant Actions</h2>
          <p>Approval, editing and delivery are unavailable until a verified consultant identity and publication backend are connected.</p>
          <div className="consult-filters">
            {(['approve', 'edit', 'request_clarification', 'reject'] as const).map(action =>
              <button key={action} type="button" aria-pressed={actionMode === action} onClick={() => {setActionMode(action);setActionDraft('');}}>
                {action === 'request_clarification' ? 'Ask Clarification' : action[0].toUpperCase() + action.slice(1)}
              </button>)}
          </div>
          {actionMode && <div><label htmlFor="consult-action-draft">Consultant {actionMode.replace('_', ' ')} draft</label>
            <textarea id="consult-action-draft" value={actionDraft} onChange={event => setActionDraft(event.target.value)} placeholder="Draft for consultant review" />
            <button type="button" disabled title="Verified consultant authorization and delivery contract required">Submit {actionMode.replace('_', ' ')}</button>
          </div>}
        </section>}
        {tab === 'Details' && <section className="state-card consult-details"><h2>Request Details</h2><dl><div><dt>Request ID</dt><dd>{active.ticketId}</dd></div><div><dt>Subject</dt><dd>{active.title}</dd></div><div><dt>Status</dt><dd><span className={`consult-badge tone-${statusClass(active.status)}`}>{active.status}</span></dd></div>{active.category && <div><dt>Category</dt><dd>{active.category}</dd></div>}{active.createdAt && <div><dt>Created</dt><dd>{active.createdAt}</dd></div>}{active.description && <div><dt>Description</dt><dd>{active.description}</dd></div>}{role === 'Admin' && active.reviewStatus && <div><dt>Review Status</dt><dd>{active.reviewStatus}</dd></div>}{role === 'Admin' && active.processingStatus && <div><dt>Processing Status</dt><dd>{active.processingStatus}</dd></div>}{role === 'Admin' && active.artifact?.status && <div><dt>Artifact Status</dt><dd>{active.artifact.status}</dd></div>}</dl></section>}
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
  </main>;
}
