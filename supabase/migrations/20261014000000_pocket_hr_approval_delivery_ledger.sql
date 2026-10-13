-- Pocket HR approval/delivery ledger (server-side only)
create table if not exists public.pocket_hr_approvals (
 id uuid primary key default gen_random_uuid(),
 request_id text not null check (length(trim(request_id)) > 0),
 revision integer not null check (revision > 0),
 approved_content text not null check (length(trim(approved_content)) > 0),
 approved_by_account_id uuid not null references public.pocket_hr_accounts(id),
 approved_at timestamptz not null default now(),
 unique (request_id, revision)
);
create table if not exists public.pocket_hr_deliveries (
 id uuid primary key default gen_random_uuid(),
 request_id text not null,
 revision integer not null,
 result text not null default 'pending' check (result in ('pending','success','failed')),
 delivered_at timestamptz,
 last_error text,
 attempt_count integer not null default 0 check (attempt_count >= 0),
 updated_at timestamptz not null default now(),
 unique (request_id, revision),
 foreign key (request_id,revision) references public.pocket_hr_approvals(request_id,revision),
 check (result <> 'success' or delivered_at is not null)
);
alter table public.pocket_hr_approvals enable row level security;
alter table public.pocket_hr_deliveries enable row level security;
revoke all on public.pocket_hr_approvals,public.pocket_hr_deliveries from anon,authenticated;
grant select,insert,update on public.pocket_hr_approvals,public.pocket_hr_deliveries to service_role;
create or replace function public.pocket_hr_approval_immutable() returns trigger language plpgsql set search_path = '' as $$
begin
 raise exception 'approved snapshots are immutable';
end; $$;
drop trigger if exists pocket_hr_approval_no_update on public.pocket_hr_approvals;
create trigger pocket_hr_approval_no_update before update or delete on public.pocket_hr_approvals for each row execute function public.pocket_hr_approval_immutable();
