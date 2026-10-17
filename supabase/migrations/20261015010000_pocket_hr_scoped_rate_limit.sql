-- Two independent limits: source abuse (90/15m) and matched account (9/15m).
-- Existing global-key RPC remains during rolling deploy compatibility.
create or replace function public.pocket_hr_allow_scoped_login_attempt(p_digest text,p_max_attempts integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v public.pocket_hr_login_limits%rowtype; t timestamptz := clock_timestamp();
begin
 if p_digest !~ '^[0-9a-f]{64}$' or p_max_attempts < 1 or p_max_attempts > 100 then return false; end if;
 insert into public.pocket_hr_login_limits(email_digest,window_started_at,attempt_count)
 values(p_digest,t,0) on conflict(email_digest) do nothing;
 select * into v from public.pocket_hr_login_limits where email_digest=p_digest for update;
 if v.blocked_until is not null and v.blocked_until>t then return false; end if;
 if v.window_started_at<=t-interval '15 minutes' then
  update public.pocket_hr_login_limits set window_started_at=t,attempt_count=1,blocked_until=null
   where email_digest=p_digest;
  return true;
 end if;
 if v.attempt_count>=p_max_attempts then
  update public.pocket_hr_login_limits set blocked_until=t+interval '15 minutes' where email_digest=p_digest;
  return false;
 end if;
 update public.pocket_hr_login_limits set attempt_count=v.attempt_count+1 where email_digest=p_digest;
 return true;
end $$;
revoke all on function public.pocket_hr_allow_scoped_login_attempt(text,integer) from public,anon,authenticated;
grant execute on function public.pocket_hr_allow_scoped_login_attempt(text,integer) to service_role;
