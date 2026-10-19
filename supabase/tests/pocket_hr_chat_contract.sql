-- Run against a disposable database AFTER applying the draft migration.
-- No production data should be used or modified.
begin;
do $$
declare r text:='chat-contract-'||gen_random_uuid()::text; m uuid; m2 uuid; v integer; n integer;
begin
 insert into public.pocket_hr_conversations(request_id,original_request) values(r,'Synthetic request');
 insert into public.pocket_hr_messages(request_id,sender,content,review_state)
 values(r,'user','Synthetic question',null);
 insert into public.pocket_hr_messages(request_id,sender,content,review_state)
 values(r,'agent','Unreviewed AI source','pending_review') returning message_id into m;
 select count(*) into n from public.pocket_hr_messages where request_id=r;
 if n<>2 then raise exception 'multiple_messages_failed'; end if;
 v:=public.pocket_hr_approve_message(m,1,'Consultant-edited answer','reviewer@example.com');
 if v<>1 then raise exception 'approval_revision_failed'; end if;
 if not exists(select 1 from public.pocket_hr_messages where message_id=m and
     content='Unreviewed AI source' and approved_content='Consultant-edited answer' and review_state='approved')
 then raise exception 'original_ai_draft_lost'; end if;
 if not exists(select 1 from public.pocket_hr_deliveries
     where request_id=r and revision=v and result='pending')
 then raise exception 'outbox_missing'; end if;
 if public.pocket_hr_approve_message(m,1,'Consultant-edited answer','reviewer@example.com')<>1
 then raise exception 'duplicate_approval_failed'; end if;
 if (select count(*) from public.pocket_hr_approvals where request_id=r)<>1
 then raise exception 'duplicate_approval_created'; end if;
 if not exists(select 1 from public.pocket_hr_messages where message_id=m and message_revision=2 and publication_revision=1)
 then raise exception 'message_publication_revisions_not_separated'; end if;
 insert into public.pocket_hr_messages(request_id,sender,content,review_state)
 values(r,'agent','Second AI draft','pending_review') returning message_id into m2;
 if public.pocket_hr_approve_message(m2,1,'Second approved answer','reviewer@example.com')<>2
 then raise exception 'second_publication_revision_failed'; end if;
 if not exists(select 1 from public.pocket_hr_messages where message_id=m2 and message_revision=2 and publication_revision=2)
 then raise exception 'second_message_revision_corrupted'; end if;
 if public.pocket_hr_approve_message(m2,1,'Second approved answer','reviewer@example.com')<>2
 then raise exception 'second_idempotent_retry_failed'; end if;
 if (select count(*) from public.pocket_hr_approvals where request_id=r)<>2
 then raise exception 'duplicate_or_missing_publication'; end if;
 -- Legacy Sheet and chat approval paths must allocate from the same ledger.
 if public.pocket_hr_approve_snapshot(r,2,'Legacy approved answer','reviewer@example.com')<>3
 then raise exception 'legacy_revision_not_shared'; end if;
 insert into public.pocket_hr_messages(request_id,sender,content,review_state)
 values(r,'agent','Third AI draft','pending_review') returning message_id into m2;
 if public.pocket_hr_approve_message(m2,1,'Third approved answer','reviewer@example.com')<>4
 then raise exception 'chat_revision_not_shared'; end if;
 if (select count(*) from public.pocket_hr_deliveries where request_id=r)<>4
 then raise exception 'shared_outbox_revision_failed'; end if;
 begin
   perform public.pocket_hr_approve_message(m2,1,'Changed answer','reviewer@example.com');
   raise exception 'conflicting_retry_accepted';
 exception when sqlstate 'P0001' then
   if sqlerrm='conflicting_retry_accepted' then raise; end if;
 end;
end $;
-- Failure and stale-write regression scenarios use isolated synthetic requests.
do $
declare
  r text := 'chat-failure-' || gen_random_uuid()::text;
  m uuid;
  v integer;
  before_approvals integer;
begin
  insert into public.pocket_hr_conversations(request_id,original_request)
  values (r,'Failure-path synthetic request');
  insert into public.pocket_hr_messages(request_id,sender,content,review_state)
  values (r,'agent','Immutable AI draft','pending_review') returning message_id into m;

  -- Reject stale expected revisions without allocating a publication.
  begin
    perform public.pocket_hr_approve_message(m,2,'Reviewed answer','reviewer@example.com');
    raise exception 'stale_revision_accepted';
  exception when others then
    if sqlerrm = 'stale_revision_accepted' then raise; end if;
  end;
  if exists (select 1 from public.pocket_hr_approvals where request_id=r)
    or exists (select 1 from public.pocket_hr_deliveries where request_id=r)
  then raise exception 'stale_revision_created_side_effects'; end if;

  -- An error after ledger insertion must roll back the ledger, delivery and message
  -- together, not leave a partial approval behind.
  begin
    v := public.pocket_hr_approve_message(m,1,'Reviewed answer','reviewer@example.com');
    raise exception 'synthetic_failure_after_approval';
  exception when others then
    if sqlerrm <> 'synthetic_failure_after_approval' then raise; end if;
  end;
  if exists (select 1 from public.pocket_hr_approvals where request_id=r)
    or exists (select 1 from public.pocket_hr_deliveries where request_id=r)
    or exists (select 1 from public.pocket_hr_messages
               where message_id=m and review_state='approved')
  then raise exception 'failed_transaction_left_partial_approval'; end if;

  -- A real approval creates one pending outbox entry; retry does not duplicate it.
  v := public.pocket_hr_approve_message(m,1,'Reviewed answer','reviewer@example.com');
  if v <> 1 then raise exception 'recovery_approval_revision_failed'; end if;
  if public.pocket_hr_approve_message(m,1,'Reviewed answer','reviewer@example.com') <> v
  then raise exception 'recovery_idempotency_failed'; end if;
  if (select count(*) from public.pocket_hr_approvals where request_id=r) <> 1
     or (select count(*) from public.pocket_hr_deliveries
         where request_id=r and revision=v and result='pending') <> 1
  then raise exception 'recovery_created_duplicate_records'; end if;

  -- Successful publication is idempotent and cannot create a second delivery row.
  if not public.pocket_hr_acknowledge_publication(r,v) then
    raise exception 'publication_ack_failed'; end if;
  if not public.pocket_hr_acknowledge_publication(r,v) then
    raise exception 'publication_ack_retry_failed'; end if;
  if (select count(*) from public.pocket_hr_deliveries where request_id=r and revision=v)<>1
  then raise exception 'publication_ack_duplicated_delivery'; end if;

  -- A failed delivery must never be treated as a successful publication.
  -- Use a fresh pending publication; successful publications must not be downgraded.
  insert into public.pocket_hr_messages(request_id,sender,content,review_state)
  values(r,'agent','Retry candidate','pending_review') returning message_id into m;
  v := public.pocket_hr_approve_message(m,1,'Retry answer','reviewer@example.com');
  update public.pocket_hr_deliveries set result='failed'
  where request_id=r and revision=v;
  if public.pocket_hr_acknowledge_publication(r,v)
  then raise exception 'failed_delivery_was_acknowledged'; end if;
  if exists (select 1 from public.pocket_hr_deliveries
             where request_id=r and revision=v and result='success')
  then raise exception 'failed_delivery_became_success'; end if;
end $;
-- Direct anon/authenticated access must remain disabled.
do $$
begin
 if has_table_privilege('anon','public.pocket_hr_messages','select')
 or has_table_privilege('authenticated','public.pocket_hr_messages','select')
 or has_function_privilege('anon','public.pocket_hr_approve_message(uuid,integer,text,text)','execute')
 or has_function_privilege('authenticated','public.pocket_hr_approve_message(uuid,integer,text,text)','execute')
 then raise exception 'message_access_exposed'; end if;
end $$;
rollback;
-- Two-connection concurrency and authorization through the backend still require integration tests.
-- Requires the PR #18 acknowledgement migration as well as the chat migration.
