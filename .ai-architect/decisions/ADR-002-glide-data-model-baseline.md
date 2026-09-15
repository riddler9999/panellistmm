# ADR-002 — Glide Export ကို Supabase Data Model Baseline အဖြစ်အသုံးပြုခြင်း (Proposal)

## Status
Proposed — **owner review/approval မရှိသေးပါ။ Migration file တစ်ခုမှ ရေးသားထားခြင်း/ apply လုပ်ထားခြင်းမရှိပါ။** ဤ document သည် `platforms/supabase/MIGRATIONS.md` ၏ Gate step 1–2 ("Requirement/ticket ကိုစစ်", "Existing schema နဲ့ migration history ကိုစစ်") ကိုကူညီပေးမည့် design proposal သာဖြစ်သည်။

## Context

`ARCHITECTURE.md` က data/state layer ကို "Supabase Postgres" ဟုသာ high-level သတ်မှတ်ထားပြီး concrete schema မရှိသေးပါ။ Client surface (Glide) ၏ production data export ("Pocket HR Partner" app, `Users/Services/Resources/AIChat/Messages/Tickets/...` — 14 tables) နှင့် Glide app builder ၏ screen recording ကို analyze လုပ်ရာ အောက်ပါ concrete evidence များတွေ့ရသည် —

1. **Glide ၏ native Workflows engine ရှိသည်** — `Workflows` tab အောက်တွင် `Workflow Run Log` / `Workflow Step Log` table (Run ID, Step index, Result, Message, Data(JSON), Output) auto-generate ဖြစ်နေသည် (လက်ရှိ 0 rows — configured ပြီး၊ သို့သော် execution အနည်းငယ်သာ)။ ဒါက Glide ကိုယ်တိုင်မှာ orchestration capability ရှိနေသည်ဟုဆိုလိုသည်။
2. **Glide → external webhook trigger ရှိပြီးသား** — Layout custom action ထဲတွင် "Communication → Call API / Trigger webhook" action ကို configure လုပ်ထားသည် (URL + Request Body builder)။ ၎င်းသည် `SCOPE.md` ၏ "Glide integration and asynchronous request/response handling" requirement ကို client-side မှာ implement လုပ်ရန် concrete mechanism ဖြစ်သည်။ **သတိပြုရန်** — recording ထဲက observed config သည် webhook URL ကို fixed n8n endpoint မဟုတ်ဘဲ per-row column (`Ticket_Title`) နှင့် bind ထားသည်ကိုတွေ့ရသည် — ၎င်းသည် in-progress/placeholder configuration ဖြစ်နိုင်ပြီး production webhook URL ကို verify လုပ်ရန်လိုအပ်သည်။
3. **Glide Tables ၏ auto-generated REST API ("Show API")** — Table တိုင်းတွင် API access ရနိုင်သည်။ ဆိုလိုသည်မှာ n8n → Glide response leg အတွက် (a) Glide-provided callback webhook သို့မဟုတ် (b) n8n မှ Glide Tables API ကိုတိုက်ရိုက် write ပြန်ခြင်း — ရွေးချယ်စရာလမ်းနှစ်သွယ်ရှိသည်။ ဒါက **architecture-level integration decision တစ်ခုအဖြစ် owner ဆုံးဖြတ်ရန်လိုအပ်သည်** (ADR scope ပြင်ပ၊ ဤစာရွက်တွင် flag သာလုပ်သည်)။
4. **Tickets table တွင် email notification columns ရှိပြီးသား** (`Ticket_Request_Con_Email_Subject`, `Ticket_Request_Update_Email_Body`, `Status_Summary_Template` — HTML template) — production မှာ client ကို auto-notify လုပ်နေသည့် behavior ရှိသည်။ n8n orchestration ဆီပြောင်းသည့်အခါ ဒီ notification behavior ကို parity ဖြစ်အောင် preserve လုပ်ရန်လိုအပ်သည်။
5. AIChat/Messages data model က session-per-timestamp UI pattern ဖြင့် production ထဲတွင် confirm ဖြစ်နေသည် — schema design အောက်ပါ 1:N structure (session → messages) နှင့်ကိုက်ညီသည်။

## Decision (Proposed)

Glide sheet structure ကို Supabase Postgres schema baseline အဖြစ် အောက်ပါအတိုင်း map လုပ်ရန် အဆိုပြုသည်။ Column name များကို production Glide field name အတိုင်း traceability အတွက် comment အဖြစ်ထားသည်။

```
companies
  id uuid pk
  legacy_glide_row_id text unique      -- Users.🔒 Row ID (company anchor)
  name text
  contact_person text
  title text
  contact_number text
  address text
  city text
  created_at timestamptz

app_users
  id uuid pk
  company_id uuid fk -> companies.id
  legacy_glide_row_id text unique      -- Users.🔒 Row ID
  email text unique
  name text
  role text                            -- 'User' | 'Admin'
  lead_consultant text
  created_at timestamptz

services
  id uuid pk
  legacy_glide_row_id text unique
  name text
  description text
  price numeric

subscriptions
  id uuid pk
  company_id uuid fk -> companies.id
  service_id uuid fk -> services.id
  start_date date
  end_date date
  invoice_number text
  payment_status text                  -- enum-like: Paid | Due | NA

resources
  id uuid pk
  legacy_glide_row_id text unique
  name text
  category text                        -- consider FK -> resource_categories
  description text
  access_link text
  file_link text
  detail_info text
  embedding vector(...)                -- pgvector, RAG ready (ARCHITECTURE.md:10)
  -- OPEN QUESTION: Resources are currently global (not company-scoped) in Glide.
  -- Confirm with owner whether RAG retrieval must stay company-scoped despite
  -- resources themselves being shared/global content (REQUIREMENTS.md:19).

resource_categories
  id uuid pk
  name text unique

ai_chat_sessions
  id uuid pk
  legacy_glide_row_id text unique      -- AIChat.🔒 Row ID
  company_id uuid fk -> companies.id
  user_id uuid fk -> app_users.id
  glide_chat_id text                   -- user-specific-Users.Chat ID bridge key
  created_at timestamptz

ai_chat_messages
  id uuid pk
  legacy_glide_row_id text unique      -- >Messages.🔒 Row ID
  session_id uuid fk -> ai_chat_sessions.id
  role text                            -- 'User' | 'Assistant' | 'Admin'
  content text
  ai_response text
  ai_response_full text
  created_at timestamptz

tickets
  id uuid pk
  legacy_glide_row_id text unique
  company_id uuid fk -> companies.id
  author_user_id uuid fk -> app_users.id
  title text
  description text
  category text                        -- Job Description | Recruitment | KPI / Performance |
                                        -- HR Policies / Procedures | Employee Conflict / Discipline |
                                        -- Workplace Communication | HR Forms / Documents |
                                        -- SOP / Process | Organization Chart / Structure
  status text                          -- Submitted | Pending | Resolved
  file_url text
  request_file_url text
  created_at timestamptz

ticket_category_assignments
  id uuid pk
  category text unique
  helpdesk_group text                  -- current human-routing reference table;
                                        -- becomes seed data for Discovery Agent config

ticket_comments
  id uuid pk
  legacy_glide_row_id text unique
  ticket_id uuid fk -> tickets.id
  author_user_id uuid fk -> app_users.id
  comment_text text
  created_at timestamptz

ticket_remarks   -- same shape as ticket_comments, separate in source; confirm if mergeable
```

### Intent-taxonomy note (cross-reference: `work/reviews/TASK-001-test-cases.md`)
`tickets.category` ၏ real-world value ၉ခု (Job Description ⋯ Organization Chart / Structure) အားလုံးသည် SPEC-001 ၏ intent သုံးခု (`hr_consultation`/`sop_generation`/`org_chart_generation`) အောက်တွင် cleanly map ဖြစ်ကြောင်း confirm ပြီးသားဖြစ်သည်။ `SOP / Process` → `sop_generation`, `Organization Chart / Structure` → `org_chart_generation`, ကျန်အားလုံး → `hr_consultation`။ ဤ table structure က `category` ကို top-level intent မှ independent column အဖြစ်ထားထားခြင်းက ဒီ mapping ကို schema level ကတည်းက support လုပ်ပေးသည်။

## Alternatives Considered
- **Glide ကို system-of-record အဖြစ်ဆက်ထားပြီး Supabase ကို derived cache/RAG index အဖြစ်သာသုံးခြင်း** — migration risk အနည်းဆုံးဖြစ်သော်လည်း `REQUIREMENTS.md` ၏ auditability/idempotency/company-scoping requirement များကို Glide ၏ no-code data layer အပေါ်မှာ enforce လုပ်ရခက်သည်။ Long-term architecture goal (n8n orchestration + Supabase state) နှင့်လည်းကွဲလွဲသည်။
- **Glide ၏ Workflow Run/Step Log schema ကို Supabase audit table pattern အဖြစ်တိုက်ရိုက် copy ယူခြင်း** — reasonable pattern ဖြစ်သော်လည်း n8n ကို orchestration layer အဖြစ် သတ်မှတ်ထားသည့် `ARCHITECTURE.md:26` နှင့် dual-orchestration-source risk ရှိသည် (အောက်တွင် Consequences တွင်ဖော်ပြ)။

## Consequences
- Glide Row ID (`🔒 Row ID`) များကို `legacy_glide_row_id` column အဖြစ်ထိန်းထားခြင်းဖြင့် migration traceability နှင့် incremental backfill ကို support လုပ်နိုင်သည်။
- `company_id` scoping ကို schema-level FK + Supabase RLS policy ဖြင့် enforce လုပ်ရန်လိုအပ်သည် (`platforms/supabase/SECURITY.md` review လိုအပ်)။
- **Dual-orchestration risk**: Glide ၏ native Workflows engine ကို production မှာ ဆက်သုံးမည်ဆိုပါက "orchestration layer = n8n" ဟူသော architecture boundary (`architecture-contract.yaml:16`) နှင့် conflict ဖြစ်နိုင်သည်။ Glide Workflows ကို "trigger dispatcher only" (n8n ကို webhook ခေါ်ရုံသာ) အဖြစ်ကန့်သတ်ရန် owner confirm ရန်လိုအပ်သည်။
- Response-leg pattern (Glide callback webhook vs. n8n writing directly to Glide Tables API) ကို ဆုံးဖြတ်ရန်လိုအပ်ပြီး၊ ရွေးချယ်ပြီးနောက် သီးခြား ADR ရေးရန်လိုအပ်သည်။
- `resources` table ၏ company-scoping status (global vs. per-company) ကို confirm ရန်လိုအပ်ပြီး RAG retrieval boundary ကို ဆုံးဖြတ်ချက်အလိုက် ပြင်ရန်လိုအပ်နိုင်သည်။
- ဤ proposal ကို migration file အဖြစ်မပြောင်းမီ `platforms/supabase/MIGRATIONS.md` Gate အပြည့်အစုံ (staging verification, data-loss review, production approval) ကိုလိုက်နာရမည်။

## Change Rule
ဤ schema baseline ကို `Accepted` အဖြစ် owner approve ပြီးမှ migration implementation စတင်နိုင်သည်။ Approval မရှိဘဲ Supabase project ပေါ်တွင် schema apply လုပ်ခြင်း မပြုလုပ်ရ။
