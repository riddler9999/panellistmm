-- Keep the consultant's optional requester label in the existing account table.
alter table public.pocket_hr_accounts
  add column if not exists display_name text;

alter table public.pocket_hr_accounts
  add constraint pocket_hr_accounts_display_name_check
  check (display_name is null or (length(trim(display_name)) between 1 and 120));
