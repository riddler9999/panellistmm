-- Align message approval with the request-wide approval ledger revision.
-- Each new n8n draft is written at the next ledger revision; approve exactly that round.
-- The existing snapshot RPC also transitions the pending message, so populate
-- the new publication metadata in that same update to satisfy the message guard.
create or replace function public.pocket_hr_approve_snapshot(
  p_request_id text, p_expected_revision integer, p_content text, p_approved_by_email text
) returns integer
language plpgsql security definer set search_path = ''
as $$
declare
  v_current integer;
  v_next integer;
  v_approver public.pocket_hr_accounts%rowtype;
  v_existing public.pocket_hr_approvals%rowtype;
  v_request_owner uuid;
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 or length(trim(p_request_id)) > 256
     or p_expected_revision is null or p_expected_revision < 0
     or p_content is null or length(trim(p_content)) = 0 or length(p_content) > 50000
     or p_approved_by_email is null then
    raise exception 'invalid_approval_input' using errcode = '22023';
  end if;
  select * into v_approver from public.pocket_hr_accounts a
    where a.email = lower(trim(p_approved_by_email))
      and a.role in ('Admin','Consultant') and a.disabled_at is null;
  if not found then raise exception 'authorized_consultant_required' using errcode = '42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id, 8492));
  select r.owner_account_id into v_request_owner from public.pocket_hr_requests r
    where r.request_id = p_request_id for update;
  if not found then raise exception 'request_not_found' using errcode = 'P0002'; end if;
  select coalesce(max(a.revision), 0) into v_current
    from public.pocket_hr_approvals a where a.request_id = p_request_id;
  if v_current <> p_expected_revision then
    select * into v_existing from public.pocket_hr_approvals a
      where a.request_id = p_request_id and a.revision = p_expected_revision + 1;
    if found and v_existing.approved_content = p_content
       and v_existing.approved_by_account_id = v_approver.id then return v_existing.revision; end if;
    raise exception 'stale_approval_revision' using errcode = 'P0001';
  end if;
  v_next := v_current + 1;
  perform 1 from public.pocket_hr_messages m
    where m.request_id = p_request_id and m.sender = 'agent'
      and m.revision = v_next and m.review_state = 'pending_review' for update;
  if not found then raise exception 'pending_agent_message_not_found' using errcode = 'P0002'; end if;
  insert into public.pocket_hr_approvals
    (request_id, revision, approved_content, approved_by_account_id, approved_by_email)
  values (p_request_id, v_next, p_content, v_approver.id, v_approver.email);
  update public.pocket_hr_messages set review_state = 'approved', approved_content = p_content,
    approved_at = clock_timestamp(), publication_revision = v_next,
    message_revision = message_revision + 1
    where request_id = p_request_id and sender = 'agent'
      and revision = v_next and review_state = 'pending_review';
  if not found then raise exception 'pending_agent_message_changed' using errcode = 'P0001'; end if;
  insert into public.pocket_hr_deliveries (request_id, revision, result)
    values (p_request_id, v_next, 'pending');
  return v_next;
end;
$$;
revoke all on function public.pocket_hr_approve_snapshot(text,integer,text,text) from public, anon, authenticated;
grant execute on function public.pocket_hr_approve_snapshot(text,integer,text,text) to service_role;

create or replace function public.pocket_hr_approve_message(
  p_message_id uuid,
  p_expected_revision integer,
  p_approved_content text,
  p_approved_by_email text
) returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  m public.pocket_hr_messages%rowtype;
  v_revision integer;
  v_current integer;
begin
  if p_message_id is null or p_expected_revision is null or p_expected_revision < 0
     or p_approved_content is null or length(trim(p_approved_content)) = 0
     or length(p_approved_content) > 50000
     or p_approved_by_email is null
     or p_approved_by_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'invalid_approval_input';
  end if;
  select * into m from public.pocket_hr_messages where message_id = p_message_id for update;
  if not found or m.sender <> 'agent' then raise exception 'message_not_found'; end if;
  if m.review_state = 'approved' then
    if m.revision = p_expected_revision + 1 and m.approved_content = p_approved_content
       and exists (select 1 from public.pocket_hr_approvals a
         where a.request_id = m.request_id and a.revision = m.publication_revision
           and lower(a.approved_by_email) = lower(p_approved_by_email)) then
      return m.publication_revision;
    end if;
    raise exception 'stale_message_revision';
  end if;
  if m.review_state <> 'pending_review' or m.revision <> p_expected_revision + 1 then
    raise exception 'stale_message_revision';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(m.request_id, 8492));
  select coalesce(max(revision), 0) into v_current from public.pocket_hr_approvals where request_id = m.request_id;
  if v_current <> p_expected_revision then raise exception 'stale_message_revision'; end if;
  v_revision := public.pocket_hr_approve_snapshot(m.request_id, v_current, p_approved_content, p_approved_by_email);
  return v_revision;
end;
$$;
revoke all on function public.pocket_hr_approve_message(uuid, integer, text, text) from public, anon, authenticated;
grant execute on function public.pocket_hr_approve_message(uuid, integer, text, text) to service_role;
