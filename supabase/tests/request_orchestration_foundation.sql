-- Run only on a local/staging database after applying the matching migration.
-- The transaction is rolled back so the test leaves no rows behind.
begin;

insert into public.request_jobs (
  request_id, source, subject, description, attachments, submitted_at
) values (
  'contract-test-request-1',
  'glide',
  'Test request',
  'Verify deterministic transitions',
  '[]'::jsonb,
  now()
);

select public.transition_request_job(
  'contract-test-request-1',
  'ROUTING',
  'routing_started',
  '{}'::jsonb,
  'contract_test',
  'test-workflow',
  'test-execution'
);

do $$
declare
  observed_state text;
  observed_events bigint;
begin
  select state into observed_state
    from public.request_jobs
   where request_id = 'contract-test-request-1';

  if observed_state <> 'ROUTING' then
    raise exception 'expected ROUTING, got %', observed_state;
  end if;

  select count(*) into observed_events
    from public.request_events
   where request_id = 'contract-test-request-1'
     and from_state = 'NEW'
     and to_state = 'ROUTING';

  if observed_events <> 1 then
    raise exception 'expected one transition event, got %', observed_events;
  end if;

  if has_table_privilege('anon', 'public.request_jobs', 'select') then
    raise exception 'anon must not have SELECT on request_jobs';
  end if;

  if has_table_privilege('authenticated', 'public.request_events', 'insert') then
    raise exception 'authenticated must not have INSERT on request_events';
  end if;
end;
$$;

do $$
begin
  perform public.transition_request_job(
    'contract-test-request-1',
    'DELIVERED',
    'invalid_direct_delivery',
    '{}'::jsonb,
    'contract_test',
    'test-workflow',
    'test-execution'
  );
  raise exception 'invalid transition unexpectedly succeeded';
exception
  when check_violation then
    null;
end;
$$;

rollback;
