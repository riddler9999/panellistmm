-- Chat message records remain server-only. Do not expose AI drafts through PostgREST.
create table public.pocket_hr_messages (
  message_id uuid primary key default gen_random_uuid(),
  request_id text not null references public.pocket_hr_conversations(request_id),
  sender text not null check (sender in ('user','agent','consultant')),
  content text not null check (length(trim(content)) > 0 and length(content) <= 50000),
  review_state text check (review_state in ('pending_review','approved')),
  revision integer not null default 1 check (revision > 0),
  approved_content text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  constraint pocket_hr_messages_state check (
    (sender='agent' and (
      (review_state='pending_review' and approved_content is null and approved_at is null)
      or (review_state='approved' and approved_content is not null and length(trim(approved_content))>0 and approved_at is not null)
    ))
    or (sender<>'agent' and review_state is null and approved_content is null and approved_at is null)
  )
);
create index pocket_hr_messages_request_created_idx on public.pocket_hr_messages(request_id,created_at,message_id);
alter table public.pocket_hr_messages enable row level security;
revoke all on public.pocket_hr_messages from public,anon,authenticated;
grant select,insert,update on public.pocket_hr_messages to service_role;

-- Lock the message row. Successful approval and immutable ledger/outbox insertion
-- commit together; failed work rolls the transaction back.
create or replace function public.pocket_hr_approve_message(
  p_message_id uuid, p_expected_revision integer, p_approved_content text,
  p_approved_by_email text
) returns integer language plpgsql security invoker set search_path = '' as $$
declare m public.pocket_hr_messages%rowtype;
        v_revision integer;
        v_current integer;
begin
  if p_message_id is null or p_expected_revision is null or p_expected_revision < 1
     or p_approved_content is null or length(trim(p_approved_content))=0
     or length(p_approved_content)>50000
     or p_approved_by_email is null
     or p_approved_by_email !~ '^[^[:space:]@]+@[^[:space:]@]+\\.[^[:space:]@]+$'
  then raise exception 'invalid_approval_input'; end if;

  select * into m from public.pocket_hr_messages
  where message_id=p_message_id for update;
  if not found or m.sender<>'agent' then raise exception 'message_not_found'; end if;

  if m.review_state='approved' then
    if m.revision=p_expected_revision+1 and
       m.approved_content=p_approved_content and
       exists (select 1 from public.pocket_hr_approvals a
         where a.request_id=m.request_id and a.revision=m.revision
           and a.approved_by_email=p_approved_by_email)
    then return m.revision; end if;
    raise exception 'stale_message_revision';
  end if;

  if m.review_state<>'pending_review' or m.revision<>p_expected_revision then
    raise exception 'stale_message_revision';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(m.request_id,8492));
  select coalesce(max(revision),0) into v_current
    from public.pocket_hr_approvals where request_id=m.request_id;
  v_revision:=v_current+1;
  insert into public.pocket_hr_approvals
    (request_id,revision,approved_content,approved_by_email)
  values (m.request_id,v_revision,p_approved_content,p_approved_by_email);
  insert into public.pocket_hr_deliveries(request_id,revision,result)
  values(m.request_id,v_revision,'pending');
  update public.pocket_hr_messages set review_state='approved',
    approved_content=p_approved_content,approved_at=clock_timestamp(),
    revision=v_revision where message_id=p_message_id;
  return v_revision;
end; $$;
revoke all on function public.pocket_hr_approve_message(uuid,integer,text,text)
  from public,anon,authenticated;
grant execute on function public.pocket_hr_approve_message(uuid,integer,text,text)
  to service_role;
