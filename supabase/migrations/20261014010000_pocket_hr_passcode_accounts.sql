-- Minimal service-role-only passcode account registry.
create table if not exists public.pocket_hr_accounts (
 id uuid primary key default gen_random_uuid(),
 email text not null unique,
 role text not null check (role in ('Admin','User')),
 passcode_hash text not null,
 enabled boolean not null default true,
 failed_attempts integer not null default 0,
 locked_until timestamptz,
 created_at timestamptz not null default now(),
 check (email = lower(trim(email))),
 check (failed_attempts >= 0)
);
create table if not exists public.pocket_hr_sessions (
 token_hash text primary key,
 account_id uuid not null references public.pocket_hr_accounts(id) on delete cascade,
 expires_at timestamptz not null
);
alter table public.pocket_hr_accounts enable row level security;
alter table public.pocket_hr_sessions enable row level security;
revoke all on public.pocket_hr_accounts,public.pocket_hr_sessions from anon,authenticated;
grant select,insert,update,delete on public.pocket_hr_accounts,public.pocket_hr_sessions to service_role;
