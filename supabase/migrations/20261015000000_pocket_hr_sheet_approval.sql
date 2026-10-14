-- Atomic, immutable approval revision allocation. Sheet owns publication state.
alter table public.pocket_hr_approvals
  add column if not exists approved_by_email text;
alter table public.pocket_hr_approvals
  alter column approved_by_account_id drop not null;

create or replace function public.pocket_hr_approve_snapshot(
  p_request_id text, p_expected_revision integer, p_content text, p_approved_by_email text
) returns integer language plpgsql security definer set search_path = ''
as $$
declare v_current integer; v_existing public.pocket_hr_approvals%rowtype; v_revision integer;
begin
  if length(trim(p_request_id)) = 0 or length(trim(p_request_id)) > 256
     or p_expected_revision < 0 or length(trim(p_content)) = 0
     or length(p_content) > 50000 or p_approved_by_email !~ '^[^ @]+@[^ @]+\\.[^ @]+$'
  then raise exception 'invalid_approval_input'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id, 8492));
  select coalesce(max(revision),0) into v_current from public.pocket_hr_approvals where request_id=p_request_id;
  if v_current <> p_expected_revision then
    select * into v_existing from public.pocket_hr_approvals
      where request_id=p_request_id and revision=p_expected_revision+1;
    if v_existing.id is not null
       and v_existing.approved_content=p_content
       and v_existing.approved_by_email=p_approved_by_email
    then return v_existing.revision; end if;
    raise exception 'stale_approval_revision' using errcode='P0001';
  end if;
  v_revision := v_current+1;
  insert into public.pocket_hr_approvals
    (request_id,revision,approved_content,approved_by_email)
  values (p_request_id,v_revision,p_content,p_approved_by_email);
  insert into public.pocket_hr_deliveries (request_id,revision,result)
  values (p_request_id,v_revision,'pending')
  on conflict (request_id,revision) do nothing;
  return v_revision;
end; $$;
revoke all on function public.pocket_hr_approve_snapshot(text,integer,text,text) from public,anon,authenticated;
grant execute on function public.pocket_hr_approve_snapshot(text,integer,text,text) to service_role;
