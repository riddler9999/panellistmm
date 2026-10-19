-- Not applied to production. Acknowledgement is only allowed for a pending, exact revision.
-- This function does not assert end-user receipt; it records successful publication.
create or replace function public.pocket_hr_acknowledge_publication(
 p_request_id text, p_revision integer
) returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_changed integer;
begin
 if p_request_id is null or length(trim(p_request_id)) = 0 or
    p_revision is null or p_revision < 1 then
   return false;
 end if;
 update public.pocket_hr_deliveries
 set result='success', delivered_at=pg_catalog.now(), updated_at=pg_catalog.now(),
     attempt_count=attempt_count+1, last_error=null
 where request_id=p_request_id and revision=p_revision
   and result='pending'
   and exists (
     select 1 from public.pocket_hr_approvals a
     where a.request_id=p_request_id and a.revision=p_revision
   );
 get diagnostics v_changed = row_count;
 if v_changed=1 then return true; end if;
 return exists(select 1 from public.pocket_hr_deliveries
   where request_id=p_request_id and revision=p_revision
   and result='success' and delivered_at is not null);
end;
$$;
revoke all on function public.pocket_hr_acknowledge_publication(text,integer) from public,anon,authenticated;
grant execute on function public.pocket_hr_acknowledge_publication(text,integer) to service_role;
