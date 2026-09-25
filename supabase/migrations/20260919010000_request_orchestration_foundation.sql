begin;

create table if not exists public.request_jobs (
  id bigint generated always as identity primary key,
  request_id text not null unique,
  user_id text,
  source text not null default 'glide' check (source in ('glide', 'telegram', 'api')),
  source_locator jsonb not null default '{}'::jsonb check (jsonb_typeof(source_locator) = 'object'),
  subject text,
  hr_issue text,
  description text,
  attachments jsonb not null default '[]'::jsonb check (jsonb_typeof(attachments) = 'array'),
  submitted_at timestamptz,
  intent text check (intent is null or intent in (
    'HR_CONSULTATION',
    'SOP_DIAGRAM',
    'ORG_CHART',
    'FORM_TEMPLATE',
    'CLARIFICATION_REQUIRED'
  )),
  intent_confidence numeric(4, 3) check (intent_confidence is null or intent_confidence between 0 and 1),
  requires_clarification boolean not null default false,
  missing_information jsonb not null default '[]'::jsonb check (jsonb_typeof(missing_information) = 'array'),
  state text not null default 'NEW' check (state in (
    'NEW',
    'ROUTING',
    'NEEDS_CLARIFICATION',
    'PROCESSING',
    'AI_DRAFT_READY',
    'PENDING_REVIEW',
    'EDITING',
    'APPROVED',
    'DELIVERED',
    'FAILED'
  )),
  review_required boolean not null default true,
  review_outcome text check (review_outcome is null or review_outcome in ('approved', 'corrected')),
  draft_text text,
  final_answer text,
  output_type text check (output_type is null or output_type in ('text', 'url', 'file')),
  output_url text,
  output_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(output_metadata) = 'object'),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error_code text,
  last_error_message text,
  last_workflow_id text,
  last_execution_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  delivered_at timestamptz
);

create table if not exists public.request_events (
  id bigint generated always as identity primary key,
  request_job_id bigint not null references public.request_jobs(id) on delete restrict,
  request_id text not null,
  event_type text not null,
  from_state text,
  to_state text,
  actor text not null default 'n8n',
  workflow_id text,
  execution_id text,
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists request_jobs_state_created_at_idx
  on public.request_jobs (state, created_at);

create index if not exists request_jobs_pending_idx
  on public.request_jobs (created_at)
  where state in ('NEW', 'ROUTING', 'PROCESSING', 'FAILED');

create index if not exists request_jobs_user_id_created_at_idx
  on public.request_jobs (user_id, created_at desc)
  where user_id is not null;

create index if not exists request_events_job_created_at_idx
  on public.request_events (request_job_id, created_at);

create index if not exists request_events_request_created_at_idx
  on public.request_events (request_id, created_at);

create index if not exists request_events_execution_id_idx
  on public.request_events (execution_id)
  where execution_id is not null;

create or replace function public.set_request_job_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists set_request_job_updated_at on public.request_jobs;
create trigger set_request_job_updated_at
before update on public.request_jobs
for each row execute function public.set_request_job_updated_at();

create or replace function public.transition_request_job(
  p_request_id text,
  p_to_state text,
  p_event_type text,
  p_payload jsonb default '{}'::jsonb,
  p_actor text default 'n8n',
  p_workflow_id text default null,
  p_execution_id text default null
)
returns public.request_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_job public.request_jobs;
  transitioned_job public.request_jobs;
  transition_allowed boolean;
begin
  if p_request_id is null or btrim(p_request_id) = '' then
    raise exception 'request_id is required' using errcode = '22023';
  end if;

  if p_event_type is null or btrim(p_event_type) = '' then
    raise exception 'event_type is required' using errcode = '22023';
  end if;

  if p_payload is null or jsonb_typeof(p_payload) <> 'object' then
    raise exception 'payload must be a JSON object' using errcode = '22023';
  end if;

  select *
    into current_job
    from public.request_jobs
   where request_id = p_request_id
   for update;

  if not found then
    raise exception 'request_job not found' using errcode = 'P0002';
  end if;

  transition_allowed := case current_job.state
    when 'NEW' then p_to_state in ('ROUTING', 'FAILED')
    when 'ROUTING' then p_to_state in ('NEEDS_CLARIFICATION', 'PROCESSING', 'FAILED')
    when 'NEEDS_CLARIFICATION' then p_to_state in ('ROUTING', 'FAILED')
    when 'PROCESSING' then p_to_state in ('AI_DRAFT_READY', 'FAILED')
    when 'AI_DRAFT_READY' then p_to_state in ('PENDING_REVIEW', 'FAILED')
    when 'PENDING_REVIEW' then p_to_state in ('EDITING', 'APPROVED', 'FAILED')
    when 'EDITING' then p_to_state in ('APPROVED', 'FAILED')
    when 'APPROVED' then p_to_state in ('DELIVERED', 'FAILED')
    when 'FAILED' then p_to_state in ('ROUTING', 'PROCESSING')
    else false
  end;

  if not transition_allowed then
    raise exception 'invalid request state transition: % -> %', current_job.state, p_to_state
      using errcode = '23514';
  end if;

  update public.request_jobs
     set state = p_to_state,
         last_workflow_id = coalesce(p_workflow_id, last_workflow_id),
         last_execution_id = coalesce(p_execution_id, last_execution_id),
         delivered_at = case when p_to_state = 'DELIVERED' then now() else delivered_at end
   where id = current_job.id
   returning * into transitioned_job;

  insert into public.request_events (
    request_job_id, request_id, event_type, from_state, to_state,
    actor, workflow_id, execution_id, payload
  ) values (
    transitioned_job.id, transitioned_job.request_id, p_event_type,
    current_job.state, transitioned_job.state,
    coalesce(nullif(btrim(p_actor), ''), 'n8n'),
    p_workflow_id, p_execution_id, p_payload
  );

  return transitioned_job;
end;
$$;

alter table public.request_jobs enable row level security;
alter table public.request_events enable row level security;

revoke all on table public.request_jobs from anon, authenticated;
revoke all on table public.request_events from anon, authenticated;
revoke all on sequence public.request_jobs_id_seq from anon, authenticated;
revoke all on sequence public.request_events_id_seq from anon, authenticated;
revoke all on function public.transition_request_job(text, text, text, jsonb, text, text, text) from public, anon, authenticated;

grant select, insert, update on table public.request_jobs to service_role;
grant select, insert on table public.request_events to service_role;
grant usage, select on sequence public.request_jobs_id_seq to service_role;
grant usage, select on sequence public.request_events_id_seq to service_role;
grant execute on function public.transition_request_job(text, text, text, jsonb, text, text, text) to service_role;

comment on table public.request_jobs is 'Canonical request lifecycle ledger. Google Sheets remains a compatibility transport, not the source of truth.';
comment on table public.request_events is 'Append-only request trace keyed by request_id and workflow execution metadata.';
comment on column public.request_jobs.user_id is 'Nullable only during the bridge transition. Production rollout requires authoritative user mapping.';

commit;
