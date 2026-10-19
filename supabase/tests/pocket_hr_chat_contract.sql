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
 begin
   perform public.pocket_hr_approve_message(m2,1,'Changed answer','reviewer@example.com');
   raise exception 'conflicting_retry_accepted';
 exception when sqlstate 'P0001' then
   if sqlerrm='conflicting_retry_accepted' then raise; end if;
 end;
end $$;
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
-- Concurrent connections and stale revision rejection require integration tests.
