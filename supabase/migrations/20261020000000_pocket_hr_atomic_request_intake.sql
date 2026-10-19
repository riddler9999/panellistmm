-- Store the initial request, user message, and conversation in one transaction.
-- Request_ID is supplied from the client's Idempotency-Key but ownership is always
-- resolved from the authenticated backend principal.
create or replace function public.pocket_hr_create_request(
  p_request_id text,
  p_owner_account_id uuid,
  p_content text
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_owner uuid;
  v_original text;
begin
  if p_request_id is null or p_request_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_owner_account_id is null
    or p_content is null or length(btrim(p_content)) = 0 or length(p_content) > 10000 then
    raise exception 'invalid_request_intake' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.pocket_hr_accounts a
    where a.id = p_owner_account_id and a.disabled_at is null
  ) then
    raise exception 'active_request_owner_required' using errcode = '42501';
  end if;

  insert into public.pocket_hr_requests(request_id, owner_account_id)
  values (p_request_id, p_owner_account_id)
  on conflict (request_id) do nothing;

  if not found then
    select r.owner_account_id into v_owner
    from public.pocket_hr_requests r
    where r.request_id = p_request_id
    for update;
    select c.original_request into v_original
    from public.pocket_hr_conversations c
    where c.request_id = p_request_id;
    if v_owner is distinct from p_owner_account_id or v_original is distinct from p_content
      or not exists (
        select 1 from public.pocket_hr_messages m
        where m.request_id = p_request_id and m.sender = 'user'
          and m.revision = 0 and m.content = p_content
      ) then
      raise exception 'request_idempotency_conflict' using errcode = '23505';
    end if;
    return false;
  end if;

  insert into public.pocket_hr_messages(request_id, sender, content, review_state, revision)
  values (p_request_id, 'user', p_content, null, 0);

  insert into public.pocket_hr_conversations
    (request_id, original_request, entries, closed_at, close_reason, reply_revision, pending_sync)
  values (p_request_id, p_content, '[]'::jsonb, null, null, 0, true);

  return true;
end;
$$;

revoke all on function public.pocket_hr_create_request(text, uuid, text) from public, anon, authenticated;
grant execute on function public.pocket_hr_create_request(text, uuid, text) to service_role;
