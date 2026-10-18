-- Shared database-backed login throttle across Vercel instances.
-- Applies to known and unknown emails; no client-controlled IP trust required.
create table if not exists public.pocket_hr_login_limits (
 email_digest text primary key check (email_digest ~ '^[0-9a-f]{64}$'),
 window_started_at timestamptz not null default now(),
 attempt_count integer not null default 0 check (attempt_count >= 0),
 blocked_until timestamptz
);
alter table public.pocket_hr_login_limits enable row level security;
revoke all on public.pocket_hr_login_limits from public, anon, authenticated;
grant select, insert, update, delete on public.pocket_hr_login_limits to service_role;

create or replace function public.pocket_hr_allow_login_attempt(p_email_digest text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v public.pocket_hr_login_limits%rowtype; t timestamptz := clock_timestamp();
begin
 if p_email_digest !~ '^[0-9a-f]{64}$' then return false; end if;
 insert into public.pocket_hr_login_limits(email_digest,window_started_at,attempt_count)
 values (p_email_digest,t,0) on conflict (email_digest) do nothing;
 select * into v from public.pocket_hr_login_limits where email_digest=p_email_digest for update;
 if v.blocked_until is not null and v.blocked_until>t then return false; end if;
 if v.window_started_at<=t-interval '15 minutes' then
   update public.pocket_hr_login_limits set window_started_at=t,attempt_count=1,blocked_until=null where email_digest=p_email_digest;
   return true;
 end if;
 if v.attempt_count>=9 then
   update public.pocket_hr_login_limits set blocked_until=t+interval '15 minutes' where email_digest=p_email_digest;
   return false;
 end if;
 update public.pocket_hr_login_limits set attempt_count=v.attempt_count+1 where email_digest=p_email_digest;
 return true;
end $$;
revoke all on function public.pocket_hr_allow_login_attempt(text) from public, anon, authenticated;
grant execute on function public.pocket_hr_allow_login_attempt(text) to service_role;
