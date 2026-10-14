import { useEffect, useMemo, useState } from 'react';
import type { ConsultationTicket } from '../server/consultationAccess';


const statusClass = (status: string) => status.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const ticketIcons: Record<string, string> = { Submitted: '▤', 'ဖောင်ပို့ပြီး (Submitted)': '▤', 'Awaiting Review': '▧', Approved: '✓', Failed: '!' };
const ticketIcon = (status: string) => ticketIcons[status] ?? '▣';

export function ConsultationDashboard() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('All');
  const [selected, setSelected] = useState<string | null>(null);
  const [session, setSession] = useState<{role:'Admin'|'User';tickets:ConsultationTicket[]}|null>(null);
  const [checking, setChecking] = useState(true);
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
      const response=await fetch('/api/pocket-hr-login',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({passcode})});
      if(!response.ok){setLoginError(response.status===401?'Passcode is incorrect.':'Login unavailable.');return;}
      const ticketsResponse=await fetch('/api/consultation',{credentials:'include',cache:'no-store'});
      if(!ticketsResponse.ok){setLoginError('Could not load requests.');return;}
      setSession(await ticketsResponse.json() as {role:'Admin'|'User';tickets:ConsultationTicket[]});
      setPasscode('');
    }catch{setLoginError('Network error. Try again.');}
    finally{setLoggingIn(false);}
  }
  async function logout() {
    try {await fetch('/api/pocket-hr-session',{method:'POST',credentials:'include'});} catch { /* clear local UI even if offline */ }
    setSession(null);setSelected(null);setPasscode('');
  }
  const [tab, setTab] = useState<'Conversation' | 'Details' | 'Files'>('Conversation');
  const [actionDraft, setActionDraft] = useState('');
  const [actionError, setActionError] = useState('');
  const [creating,setCreating]=useState(false);
  const [newTitle,setNewTitle]=useState('');
  const [newCategory,setNewCategory]=useState('');
  const [newDescription,setNewDescription]=useState('');
  const [requestError,setRequestError]=useState('');
  const [requestBusy,setRequestBusy]=useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  const tickets = useMemo(() => session?.tickets ?? [], [session]);
  const role = session?.role ?? 'User';
  const visible = useMemo(() => tickets.filter(ticket =>
    (filter === 'All' || ticket.status === filter) &&
    [ticket.ticketId, ticket.title].some(value => value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()))
  ), [tickets, filter, search]);
  const active = tickets.find(ticket => ticket.ticketId === selected);
  // Derive filter labels from actual ticket statuses; never invent workflow states.
  const filters = ['All', ...Array.from(new Set(tickets.map(ticket => ticket.status).filter(Boolean)))];

  async function approveTicket() {
    if (!active || actionSubmitting || role !== 'Admin') return;
    setActionSubmitting(true); setActionError('');
    try {
      const response = await fetch('/api/consultation-approve', {
        method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({action:'approve',requestId:active.ticketId,expectedRevision:active.revision ?? 0,content:actionDraft})
      });
      if (!response.ok) { setActionError(response.status===409?'This request changed. Reload and review again.':'Approval was not published. Retry after checking the request.'); return; }
      const refreshed = await fetch('/api/consultation',{credentials:'include',cache:'no-store'});
      if (!refreshed.ok) throw new Error('refresh_failed');
      setSession(await refreshed.json() as {role:'Admin'|'User';tickets:ConsultationTicket[]});
      setActionDraft('');
    } catch { setActionError('Could not refresh the approved request.'); }
    finally { setActionSubmitting(false); }
  }

  async function refreshTickets(){
    const response=await fetch('/api/consultation',{credentials:'include',cache:'no-store'});
    if(!response.ok)throw new Error('refresh_failed');
    setSession(await response.json() as {role:'Admin'|'User';tickets:ConsultationTicket[]});
  }
  async function createRequest(event:React.FormEvent){
    event.preventDefault();if(requestBusy)return;
    setRequestBusy(true);setRequestError('');
    try{
      const response=await fetch('/api/consultation-create',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({title:newTitle,category:newCategory,description:newDescription})});
      if(!response.ok)throw new Error('create_failed');
      await refreshTickets();setCreating(false);setNewTitle('');setNewCategory('');setNewDescription('');
    }catch{setRequestError('Could not submit request. Please retry.');}
    finally{setRequestBusy(false);}
  }
  async function consultantAction(action:'edit'|'request_clarification'|'reject'){
    if(!active||actionSubmitting)return;
    setActionSubmitting(true);setActionError('');
    try{
      const response=await fetch('/api/consultation-action',{method:'POST',credentials:'include',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({
          action,requestId:active.ticketId,expectedRevision:active.revision??0,content:actionDraft
        })});
      if(!response.ok)throw new Error('action_failed');
      await refreshTickets();setActionDraft('');
    }catch{setActionError('Action could not be saved. Reload and retry.');}
    finally{setActionSubmitting(false);}
  }

  if (!session) return <main className="viewer-shell consultation-dashboard"><section className="consult-welcome"><div className="consult-welcome-mark">P</div><h1>Pocket HR</h1>
    {checking ? <p>Loading...</p> : <form onSubmit={login} className="pocket-hr-pin-form">
      <p>Enter the passcode provided by your administrator.</p>
      <label htmlFor="pocket-hr-pin">4-Digit Passcode</label>
      <input id="pocket-hr-pin" type="password" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoComplete="current-password" required value={passcode} onChange={event=>setPasscode(event.target.value.replace(/\D/g,'').slice(0,4))}/>
      {loginError && <p role="alert">{loginError}</p>}
      <button type="submit" className="consult-new" disabled={loggingIn}>{loggingIn?'Signing in...':'Open Dashboard'}</button>
    </form>}
    </section></main>;

  return <main className="viewer-shell consultation-dashboard">
    
    {session && <div className="consult-preview-banner"><span>{role === 'Admin' ? 'Consultant Dashboard' : 'My Requests'}</span><button type="button" onClick={logout}>Log out</button></div>}
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
          <h2>Consultant Approval</h2>
          <label htmlFor="consult-action-draft">Approved answer</label>
          <textarea id="consult-action-draft" value={actionDraft} onChange={event=>setActionDraft(event.target.value)} placeholder="Review and enter the answer to publish" />
          {actionError && <p role="alert">{actionError}</p>}
          <button type="button" disabled={actionSubmitting || !actionDraft.trim()} onClick={approveTicket}>{actionSubmitting?'Publishing...':'Approve & Publish'}</button>
          <button type="button" disabled={actionSubmitting || !actionDraft.trim()} onClick={()=>consultantAction('edit')}>Save Draft</button>
          <button type="button" disabled={actionSubmitting || !actionDraft.trim()} onClick={()=>consultantAction('request_clarification')}>Ask Clarification</button>
          <button type="button" disabled={actionSubmitting} onClick={()=>consultantAction('reject')}>Reject</button>
        </section>}
        {tab === 'Details' && <section className="state-card consult-details"><h2>Request Details</h2><dl><div><dt>Request ID</dt><dd>{active.ticketId}</dd></div><div><dt>Subject</dt><dd>{active.title}</dd></div><div><dt>Status</dt><dd><span className={`consult-badge tone-${statusClass(active.status)}`}>{active.status}</span></dd></div>{active.category && <div><dt>Category</dt><dd>{active.category}</dd></div>}{active.createdAt && <div><dt>Created</dt><dd>{active.createdAt}</dd></div>}{active.description && <div><dt>Description</dt><dd>{active.description}</dd></div>}{role === 'Admin' && active.reviewStatus && <div><dt>Review Status</dt><dd>{active.reviewStatus}</dd></div>}{role === 'Admin' && active.processingStatus && <div><dt>Processing Status</dt><dd>{active.processingStatus}</dd></div>}{role === 'Admin' && active.artifact?.status && <div><dt>Artifact Status</dt><dd>{active.artifact.status}</dd></div>}</dl></section>}
        {tab === 'Files' && <section className="state-card consult-files"><div className="consult-file-icon">▤</div>{role === 'Admin' && active.artifact?.title ? <><h2>{active.artifact.title}</h2><p>{[active.artifact.type, active.artifact.format, active.artifact.status].filter(Boolean).join(' · ')}</p></> : <><h2>No files available</h2><p>Only verified, authorized attachments will appear here.</p></>}</section>}
      </> : <>
        <div className="consult-list-heading"><h1>{role === 'Admin' ? 'All Requests' : 'My Requests'}</h1><p>{tickets.length} requests</p></div>
        <div className="consult-toolbar">
          <input aria-label="Search requests" type="search" placeholder="Search requests, subject, or ID..." value={search} onChange={event => setSearch(event.target.value)} />
          <button type="button" className="consult-new" onClick={()=>setCreating(true)}>＋ New Request</button>
        </div>
        {creating && <form className="state-card" onSubmit={createRequest}>
          <h2>New Request</h2>
          <label htmlFor="new-request-title">Title</label>
          <input id="new-request-title" required maxLength={160} value={newTitle} onChange={e=>setNewTitle(e.target.value)}/>
          <label htmlFor="new-request-category">Category</label>
          <input id="new-request-category" maxLength={80} value={newCategory} onChange={e=>setNewCategory(e.target.value)}/>
          <label htmlFor="new-request-description">Description</label>
          <textarea id="new-request-description" required maxLength={10000} value={newDescription} onChange={e=>setNewDescription(e.target.value)}/>
          {requestError && <p role="alert">{requestError}</p>}
          <button type="submit" disabled={requestBusy}>{requestBusy?'Submitting...':'Submit Request'}</button>
          <button type="button" onClick={()=>setCreating(false)}>Cancel</button>
        </form>}
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
