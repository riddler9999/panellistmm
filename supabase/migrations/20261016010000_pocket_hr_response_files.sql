create table if not exists public.pocket_hr_response_files (
 id uuid primary key,
 request_id text not null,
 name text not null,
 mime text not null check (mime in ('image/png','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')),
 size integer not null check(size>0 and size<=2097152),
 object_path text not null unique,
 uploaded_by text not null,
 created_at timestamptz not null default now()
);
create index if not exists pocket_hr_response_files_request on public.pocket_hr_response_files(request_id);
alter table public.pocket_hr_response_files enable row level security;
revoke all on public.pocket_hr_response_files from anon,authenticated;
grant select,insert on public.pocket_hr_response_files to service_role;
-- Intentionally no public storage policies. Server authorizes each download.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('pocket-hr-responses','pocket-hr-responses',false,2097152,array['image/png','application/pdf','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict(id) do nothing;
-- A same-named pre-existing public bucket must not silently bypass review gates.
do $$ begin
 if exists(select 1 from storage.buckets where id='pocket-hr-responses' and public)
 then raise exception 'pocket_hr_response_bucket_must_be_private'; end if;
end $$;
