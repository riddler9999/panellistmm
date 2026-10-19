-- Bring the already-existing message table to the server-side review contract.
-- Existing rows are preserved; no Sheet data is imported.
alter table public.pocket_hr_messages
  add column if not exists message_revision integer,
  add column if not exists publication_revision integer,
  add column if not exists approved_content text,
  add column if not exists approved_at timestamptz;

update public.pocket_hr_messages
set message_revision = greatest(revision, 1)
where message_revision is null;

alter table public.pocket_hr_messages
  alter column message_revision set default 1,
  alter column message_revision set not null;

alter table public.pocket_hr_messages
  add constraint pocket_hr_messages_message_revision_check check (message_revision > 0),
  add constraint pocket_hr_messages_publication_revision_check check (publication_revision is null or publication_revision > 0),
  add constraint pocket_hr_messages_new_state_check check (
    (sender = 'agent' and (
      (review_state = 'pending_review' and approved_content is null and approved_at is null and publication_revision is null)
      or (review_state = 'approved' and approved_content is not null and length(trim(approved_content)) > 0 and approved_at is not null and publication_revision is not null)
    ))
    or (sender <> 'agent' and review_state is null and approved_content is null and approved_at is null and publication_revision is null)
  );

create unique index if not exists pocket_hr_agent_message_revision_unique
  on public.pocket_hr_messages(request_id, revision)
  where sender = 'agent';

create unique index if not exists pocket_hr_message_publication_revision_unique
  on public.pocket_hr_messages(request_id, publication_revision)
  where publication_revision is not null;

-- n8n may retry an execution. A retry with the same request revision and content
-- returns the original message; conflicting content or an already-approved draft fails closed.
create or replace function public.pocket_hr_store_agent_message(
  p_request_id text,
  p_message_revision integer,
  p_content text,
  p_user_email text
) returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner_email text;
  v_message public.pocket_hr_messages%rowtype;
begin
  if p_request_id is null or length(trim(p_request_id)) = 0 or length(p_request_id) > 256
     or p_message_revision is null or p_message_revision < 1
     or p_content is null or length(trim(p_content)) = 0 or length(p_content) > 50000
     or p_user_email is null or length(trim(p_user_email)) > 254 then
    raise exception 'invalid_agent_message';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id, 28451));
  select lower(trim(a.email)) into v_owner_email
    from public.pocket_hr_requests r
    join public.pocket_hr_accounts a on a.id = r.owner_account_id
    where r.request_id = p_request_id;
  if v_owner_email is null or v_owner_email <> lower(trim(p_user_email)) then
    raise exception 'request_owner_mismatch';
  end if;

  select * into v_message from public.pocket_hr_messages
    where request_id = p_request_id and sender = 'agent'
      and revision = p_message_revision for update;
  if found then
    if v_message.content = p_content and v_message.review_state = 'pending_review' then
      return v_message.message_id;
    end if;
    raise exception 'agent_message_revision_conflict';
  end if;

  insert into public.pocket_hr_messages
    (request_id, sender, content, review_state, revision, message_revision)
  values
    (p_request_id, 'agent', p_content, 'pending_review', p_message_revision, p_message_revision)
  returning * into v_message;
  return v_message.message_id;
end;
$$;

revoke all on function public.pocket_hr_store_agent_message(text, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.pocket_hr_store_agent_message(text, integer, text, text)
  to service_role;

-- Approval and the immutable approval/delivery ledger remain one transaction.
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
  if p_message_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_approved_content is null or length(trim(p_approved_content)) = 0
     or length(p_approved_content) > 50000
     or p_approved_by_email is null
     or p_approved_by_email !~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' then
    raise exception 'invalid_approval_input';
  end if;

  select * into m from public.pocket_hr_messages where message_id = p_message_id for update;
  if not found or m.sender <> 'agent' then raise exception 'message_not_found'; end if;

  if m.review_state = 'approved' then
    if m.message_revision = p_expected_revision + 1
       and m.approved_content = p_approved_content
       and exists (select 1 from public.pocket_hr_approvals a
         where a.request_id = m.request_id and a.revision = m.publication_revision
           and lower(a.approved_by_email) = lower(p_approved_by_email)) then
      return m.publication_revision;
    end if;
    raise exception 'stale_message_revision';
  end if;
  if m.review_state <> 'pending_review' or m.message_revision <> p_expected_revision then
    raise exception 'stale_message_revision';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(m.request_id, 8492));
  select coalesce(max(revision), 0) into v_current from public.pocket_hr_approvals where request_id = m.request_id;
  v_revision := public.pocket_hr_approve_snapshot(m.request_id, v_current, p_approved_content, p_approved_by_email);
  update public.pocket_hr_messages set review_state = 'approved', approved_content = p_approved_content,
    approved_at = clock_timestamp(), message_revision = m.message_revision + 1,
    publication_revision = v_revision where message_id = p_message_id;
  return v_revision;
end;
$$;

revoke all on function public.pocket_hr_approve_message(uuid, integer, text, text)
  from public, anon, authenticated;
grant execute on function public.pocket_hr_approve_message(uuid, integer, text, text)
  to service_role;
