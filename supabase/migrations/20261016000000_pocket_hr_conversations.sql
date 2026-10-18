-- Conversation continuity; only service-role server code may read/write.
create table if not exists public.pocket_hr_conversations (
 request_id text primary key,
 original_request text not null,
 entries jsonb not null default '[]'::jsonb,
 closed_at timestamptz,
 close_reason text check (close_reason in ('user','timeout')),
 reply_revision integer not null default 0,
 pending_sync boolean not null default false
);
alter table public.pocket_hr_conversations enable row level security;
revoke all on public.pocket_hr_conversations from anon, authenticated;
grant all on public.pocket_hr_conversations to service_role;
create or replace function public.pocket_hr_save_conversation(p_state jsonb)
returns void language sql security invoker set search_path = '' as $$
 insert into public.pocket_hr_conversations
 select * from jsonb_populate_record(null::public.pocket_hr_conversations, p_state)
 on conflict (request_id) do update set
 original_request=excluded.original_request, entries=excluded.entries,
 closed_at=excluded.closed_at, close_reason=excluded.close_reason,
 reply_revision=excluded.reply_revision, pending_sync=excluded.pending_sync;
$$;
revoke all on function public.pocket_hr_save_conversation(jsonb) from public,anon,authenticated;
grant execute on function public.pocket_hr_save_conversation(jsonb) to service_role;
