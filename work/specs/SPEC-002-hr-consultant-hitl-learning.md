# SPEC-002 — HR Consultant Agent နှင့် HITL Learning Loop

## ရည်ရွယ်ချက်
Client request တစ်ခုအတွက် HR Consultant Agent မှ RAG-grounded draft answer ထုတ်ပေးပြီး၊ consultant က review လုပ်ကာ approve သို့မဟုတ် edit လုပ်၍ client ထံပို့နိုင်သော loop တည်ဆောက်ရန်။ Consultant ပြင်ပေးသည့် correction တိုင်းကို knowledge base ထဲပြန်သွင်းပြီး agent ၏ အမှားကို အချိန်နှင့်အမျှ လျှော့ချရန်။

## Scope

### ပါဝင်သည်
- Request → RAG retrieval → draft answer generation
- Consultant review surface (Glide `All Requests` ၏ ticket detail အောက်ခြေ)
- Approve / Edit / Send state machine
- Correction ကို knowledge base သို့ ingest လုပ်ခြင်း
- De-identification နှင့် knowledge scoping
- Approval-rate metric

### မပါဝင်
- Discovery routing (SPEC-001 / TASK-001 — ယခု backlog)
- SOP generation, Org Chart generation
- Google Drive document ingestion (day-1 မဟုတ်၊ အောက်တွင်ရှင်းပြ)
- Production deployment

## State Machine

Ticket တစ်ခု၏ review lifecycle —

```
  [ Submitted ]
        │  n8n webhook
        ▼
  [ AI Drafting ]
        │  agent draft ရေးပြီး
        ▼
  [ Pending Review ]  ◄── consultant သာမြင်ရသည်။ client မမြင်ရ။
        │
        ├── Approve ──► [ Sent ]     final_answer = ai_draft
        │                              review_outcome = approved
        │
        └── Edit ──► [ Editing ] ──Send──► [ Sent ]
                                             final_answer = consultant_answer
                                             review_outcome = corrected
                                             └──► correction ingest queue
```

**Invariant**: `Pending Review` သို့မဟုတ် `AI Drafting` state ရှိစဉ် client သည် draft answer ကို **လုံးဝမမြင်ရ**။ Glide row-owner / role visibility ဖြင့် enforce လုပ်ရမည်။

## Data Contracts

### Glide — Tickets table သို့ ထပ်ဖြည့်ရမည့် column များ
| Column | Type | ရေးသူ | မှတ်ချက် |
|---|---|---|---|
| `ai_draft_answer` | text | n8n | Consultant သာမြင်ရ |
| `ai_confidence` | text | n8n | `high` / `medium` / `low` |
| `ai_sources` | text | n8n | Retrieval မှရသော source reference |
| `review_state` | text | Glide action | `drafting` / `pending_review` / `editing` / `sent` |
| `consultant_answer` | text | consultant | Edit path မှသာ |
| `final_answer` | text | Glide action | Client မြင်ရသည့် တစ်ခုတည်းသော field |
| `review_outcome` | text | Glide action | `approved` / `corrected` |
| `knowledge_scope` | text | consultant | `general` / `company_policy` — correction အတွက် |
| `reviewed_by` | text | Glide action | Audit |
| `reviewed_at` | timestamp | Glide action | Audit |

### Supabase — RAG corpus: ရှိပြီးသား `public.hr_kb` ကိုသုံးမည်

⚠️ **Supabase project `Panellist` တွင် `public.hr_kb` table ရှိပြီးသားဖြစ်သည်** (migration `20260909184210_hr_kb_pgvector_schema`, rows 0)။ ဤ spec ၏ မူလ draft တွင် `knowledge_entries` အသစ်ကိုအဆိုပြုခဲ့သော်လည်း — `agent/RULES.md` ("duplicate abstraction မဖန်တီးရ") အရ **ရှိပြီးသား `hr_kb` ကိုသာသုံးမည်**။

ရှိပြီးသား schema —

```
public.hr_kb
  id                bigint identity pk
  source_id         text            -- provenance key
  source_version    text
  embedding_version text
  pipeline_version  text
  source_type       text CHECK IN (glidedoc, faq, ticketqa, law,
                                   contextnote, meta, admin_correction)
  title             text
  category          text
  language          text
  scope             text CHECK (scope = 'generic')      -- ⚠️ generic သာခွင့်ပြု
  chunk_text        text            -- embed လုပ်သည့် field
  chunk_hash        text
  embedding         vector(1536)
  priority          integer default 0
  updated_at        timestamptz

  UNIQUE (source_id, chunk_hash)                        -- dedup
  INDEX  hnsw (embedding vector_cosine_ops)             -- ANN
  RLS enabled, policy ၀ ခု                              -- service_role သာဝင်နိုင်
```

**Mapping**: Resources → `source_type = 'glidedoc'`, consultant correction → `source_type = 'admin_correction'`, ticket Q&A → `'ticketqa'`。

**ရှိပြီးသား schema က ဤ spec ထက်ပိုကောင်းသည့်အချက်များ**: `pipeline_version` / `embedding_version` (re-embed migration အတွက်), `chunk_hash` + unique index (dedup), `priority` (ranking boost)。ဤအချက်များကို ဤ spec သို့ လက်ခံထည့်သွင်းသည်。

**Gap — TASK-003 မစမီ ဆုံးဖြတ်ရန် (Open Items §4, §5)**:
| လိုအပ်ချက် | `hr_kb` အခြေအနေ |
|---|---|
| Question/answer ခွဲခြားခြင်း | `chunk_text` တစ်ခုတည်း — `answer_text` column ထပ်ဖြည့်ရန်လိုနိုင် |
| `company_policy` scope | `scope` CHECK က `'generic'` သာခွင့်ပြု — extend လုပ်မလား မလုပ်မလား |
| `is_active` / `superseded_by` | မရှိ — conflict handling အတွက်လိုအပ် |
| `created_by` audit | မရှိ |

ဤအားလုံးသည် **additive migration** များဖြစ်၍ data loss မရှိပါ။ သို့သော် `platforms/supabase/MIGRATIONS.md` gate အရ owner approval လိုအပ်သည်。

### Supabase — Metric table (အသစ်)

```
review_events                          -- metric + audit
  id uuid pk
  ticket_id uuid
  company_id uuid
  outcome text                         -- 'approved' | 'corrected'
  ai_confidence text
  reviewed_by text
  reviewed_at timestamptz
  edit_distance int null               -- corrected ဖြစ်မှ၊ ပြင်မှုပမာဏ signal
```

## RAG Design

### Embedding model
`gemini-embedding-001` — ဘာသာစကား ၁၀၀+ support, Matryoshka Representation Learning။

**Dimension = 1536** (MRL truncation)။ အကြောင်းရင်း: pgvector ၏ HNSW/IVFFlat index များသည် **dimension 2000 တွင်ကန့်သတ်ထားသည်** — default 3072 ကို index လုပ်၍မရပါ။ 1536 သည် limit အတွင်းရှိပြီး storage သက်သာသည်။ (အခြားရွေးချယ်စရာ: `halfvec` သည် 4000 dim အထိ index လုပ်နိုင်သည် — corpus ကြီးလာပြီး precision လိုအပ်လာမှ ပြန်စဉ်းစားရန်။)

### ✅ Pre-implementation gate — Burmese retrieval benchmark (ပြီးစီး)

မြန်မာစာသည် low-resource language ဖြစ်၍ model ၏ multilingual claim ကို ဤ corpus အပေါ် verify ရန်လိုအပ်ခဲ့သည်။

**ရလဒ်: GATE PASSED** — evidence: `work/reviews/TASK-002-retrieval-benchmark.md`
- Self-retrieval (မြန်မာ ၄၀ query): R@5 = 1.00, median rank = 1
- Real ticket question ၁၂ ခု: ၁၀ ခု top-1 တိကျ
- **မြန်မာ top-1 similarity ≈ 0.673 vs English ≈ 0.674 — မြန်မာစာ deficit မရှိ**
- Cross-lingual retrieval အလုပ်လုပ်သည် (မြန်မာ query → English document)

Corpus gap တစ်ခုတွေ့ရှိသည် — `Resources` သည် template/form များသာဖြစ်ပြီး advice content မဟုတ်၍ broad strategic question များတွင် generic ရလဒ်ထွက်သည်။ ၎င်းသည် model ပြဿနာမဟုတ်ဘဲ၊ correction learning loop က ဖြည့်ပေးရမည့်အရာဖြစ်သည် (benchmark evidence file §ဒုတိယ Finding)。

### 🔑 ဘာကို embed လုပ်မလဲ — critical design decision
Correction တစ်ခုကို သိမ်းသည့်အခါ **အဖြေတစ်ခုတည်း မသိမ်းရ**။ `(question, answer)` pair အဖြစ်သိမ်းပြီး —

- **Embed လုပ်သည်: `question_text`**
- **Retrieval က return ပြန်သည်: `answer_text`**

အကြောင်းရင်း: incoming query များသည် **မေးခွန်း** ဖြစ်သည်။ Question-to-question similarity သည် question-to-answer similarity ထက် သိသိသာသာပိုတိကျသည် (asymmetric retrieval problem)။ အဖြေကို embed လုပ်ပါက retrieval quality ကျဆင်းပြီး learning loop အလုပ်မလုပ်ပါ။

### Retrieval scope rule

လက်ရှိ `hr_kb` သည် `scope = 'generic'` သာခွင့်ပြုသဖြင့် retrieval သည် corpus တစ်ခုလုံးပေါ်တွင်ဖြစ်သည် — company filter မလိုပါ။

`company_policy` ကို support လုပ်ရန်ဆုံးဖြတ်ပါက (Open Item §5) scope rule မှာ —

```sql
WHERE is_active = true
  AND ( scope = 'generic'
        OR (scope = 'company' AND company_id = X) )
```

`company` scope entry များကို အခြား company သို့ **လုံးဝမပြန်ထုတ်ရ** — privacy အတွက်မဟုတ်ဘဲ **correctness** အတွက်ဖြစ်သည် (Company A ၏ probation policy သည် Company B အတွက် မှားနေသောအဖြေဖြစ်သည်)။ ၎င်းကို Supabase RLS ဖြင့် enforce လုပ်ရမည်၊ application logic တစ်ခုတည်းဖြင့်မလုံလောက်ပါ။

### De-identification (ingest မလုပ်မီ mandatory)
Correction ကို `knowledge_entries` သို့မသွင်းမီ အောက်ပါတို့ကို strip/replace လုပ်ရမည် — company name, person name, email address, phone number, invoice number။ `general` scope entry များတွင် ဤ de-identification **မဖြစ်မနေလိုအပ်သည်**။

## Learning Ingestion Rules

1. `review_outcome = corrected` ဖြစ်မှသာ ingest လုပ်မည်။ `approved` သည် metric အဖြစ်သာမှတ်မည် (RAG ထဲမထည့်)။
2. Consultant သည် ingest မလုပ်မီ `knowledge_scope` ကို ရွေးရမည် (default `company_policy` — လုံခြုံသောဘက်)။
3. **Conflict handling**: ingest မလုပ်မီ ရှိပြီးသား active entry များနှင့် question similarity စစ်ရမည်။ Threshold ကျော်သော near-duplicate ရှိပါက —
   - entry အသစ်ကို insert လုပ်
   - ဟောင်းသည့် entry ကို `is_active = false`, `superseded_by = <new id>` သတ်မှတ်
   - **Parallel contradictory entry နှစ်ခု တစ်ပြိုင်နက် active မဖြစ်စေရ** — ဒါက RAG pollution ၏ အဓိကအကြောင်းရင်းဖြစ်သည်
4. Entry တိုင်းတွင် `created_by` + `created_at` ရှိရမည် (audit + bad entry ကို ပြန်ရှာနိုင်ရန်)။

## Metrics — "အမှားနည်းလာသည်" ကို ဘယ်လိုသက်သေပြမလဲ

**Primary KPI: Approval rate without edit** = `approved / (approved + corrected)` — ရက် ၃၀ rolling window။

ဤ metric မရှိဘဲ loop အလုပ်လုပ်/မလုပ် သက်သေမပြနိုင်ပါ။ Supporting metrics —
- Category အလိုက် approval rate (ဘယ် domain မှာ agent အားနည်းလဲ ပြသည်)
- `edit_distance` ၏ ပျမ်းမျှ (approve မလုပ်သော်လည်း ပြင်မှုနည်းလာခြင်း = တိုးတက်မှု)
- Retrieval hit rate (RAG က သက်ဆိုင်ရာ entry ရှာတွေ့/မတွေ့)

## Agent Behavior Requirements

1. **Legal guardrail** — လက်ရှိ production prompt ၏ boundary ကို ထိန်းသိမ်းရမည်: ဥပဒေအကြံဉာဏ်ကို ရှေ့တန်းမတင်ရ၊ practical HR management ကို ဦးစားပေးရ၊ တိကျသော legal drafting အတွက် consultant review သို့ လမ်းညွှန်ရမည်။ ဤအချက်သည် prompt string တစ်ခုတည်းမဟုတ်ဘဲ **testable requirement** ဖြစ်ရမည်။
2. **Language** — user ၏ဘာသာစကားနှင့် ကိုက်ညီစွာဖြေရမည် (မြန်မာလိုမေးလျှင် မြန်မာလို)။
3. **No-retrieval honesty** — RAG မှ သက်ဆိုင်ရာ entry မရပါက အဖြေကို **မလုပ်ကြံရ**။ `ai_confidence = low` သတ်မှတ်ပြီး consultant ကို သတိပေးရမည်။
4. **Source attribution** — `ai_sources` တွင် retrieval မှရသော entry reference ထည့်ရမည် (consultant က verify လုပ်နိုင်ရန်)။

## Failure Handling

| အခြေအနေ | လိုအပ်သောအပြုအမူ |
|---|---|
| Agent timeout | `review_state` ကို `pending_review` သို့ပြောင်းပြီး `ai_draft_answer` ကို empty ထား၊ consultant ကို အသိပေး — ticket မပျောက်ရ |
| RAG empty / no match | `ai_confidence = low`၊ agent က "လုံလောက်သော reference မရှိပါ" ဟုဖော်ပြရမည် |
| LLM provider error | Retry (bounded)၊ ကျဆုံးပါက manual review path သို့ fallback |
| Duplicate webhook | `ticket_id` ကို idempotency key အဖြစ်သုံး၊ draft နှစ်ခါမထုတ်ရ |
| Correction ingest failure | Ticket delivery ကို **မပိတ်ဆို့ရ** — client ဆီအဖြေရောက်ရမည်၊ ingest ကို retry queue သို့ပို့ရမည် |

## Security

- Draft answer ကို client role မမြင်ရ (Glide visibility condition)
- `company_policy` entry များကို cross-company retrieval မလုပ်ရ — Supabase RLS ဖြင့် enforce လုပ်ရမည်၊ application logic တစ်ခုတည်းဖြင့်မလုံလောက် (`platforms/supabase/SECURITY.md`)
- De-identification မပြီးဘဲ `general` scope entry မသွင်းရ
- Service-role key ကို Glide client သို့ မထုတ်ရ — Supabase write များကို n8n boundary မှသာလုပ်ရမည်

## Acceptance Criteria

- [ ] Burmese retrieval benchmark ပြီးစီးပြီး hit-rate evidence မှတ်တမ်းရှိသည်
- [ ] Request တစ်ခုဝင်လာလျှင် draft answer ထွက်ပြီး `pending_review` state သို့ရောက်သည်
- [ ] Client သည် `pending_review` state တွင် draft ကို မမြင်ရ (verified)
- [ ] Approve နှိပ်လျှင် `final_answer` = draft ဖြစ်ပြီး client ထံရောက်သည်
- [ ] Edit → Send လျှင် `final_answer` = consultant answer ဖြစ်ပြီး client ထံရောက်သည်
- [ ] Corrected case တွင် `knowledge_entries` သို့ entry အသစ်ဝင်သည် (question embedded, answer stored)
- [ ] `company_policy` entry သည် အခြား company ၏ retrieval တွင် **မပေါ်ရ** (negative test)
- [ ] `general` entry သည် de-identified ဖြစ်ကြောင်း verify လုပ်သည်
- [ ] Near-duplicate correction ဝင်လာလျှင် ဟောင်းသည့် entry `is_active = false` ဖြစ်သည်
- [ ] ဒုတိယအကြိမ် တူညီသောမေးခွန်းတွင် correction ကို retrieval မှပြန်ရသည် (**learning loop ၏ အဓိက proof**)
- [ ] Approval rate metric ကို query လုပ်၍ရသည်
- [ ] Timeout / RAG-empty / duplicate-webhook failure case များ verify ပြီးဖြစ်သည်

## Verification
Acceptance criteria တိုင်းအတွက် observable evidence လိုအပ်သည်။ အထူးသဖြင့် **"ဒုတိယအကြိမ်တွင် correction ပြန်ရသည်"** case သည် ဤ spec တစ်ခုလုံး၏ အဓိကရည်ရွယ်ချက်ဖြစ်၍ end-to-end test evidence မဖြစ်မနေလိုအပ်သည်။

## Open Items (implementation မစမီ ဆုံးဖြတ်ရန်)
1. Near-duplicate similarity threshold မည်မျှထားမည်
2. LLM provider / model ရွေးချယ်မှု (`ARCHITECTURE.md:11` အရ model ကို architecture invariant အဖြစ် lock မလုပ်ရ)
3. Google Drive document ingestion ကို မည်သည့်အဆင့်တွင်ထည့်မည် (day-1 မဟုတ်)
4. **`hr_kb` တွင် `answer_text` column ထပ်ဖြည့်မလား** — လက်ရှိ `chunk_text` တစ်ခုတည်းသာရှိသည်။ Correction များအတွက် "question ကို embed, answer ကို return" pattern လုပ်ရန် answer field သီးသန့်လိုအပ်သည်။ အခြားရွေးချယ်စရာ: `chunk_text` ထဲ `Q: ... / A: ...` ပေါင်းထည့်ခြင်း (schema မပြောင်းရ၊ သို့သော် embedding သည် answer ကိုပါဖုံးလွှမ်းသွားမည်)。
5. **`scope` CHECK ကို `'company'` အထိ ချဲ့မလား** — လက်ရှိ `'generic'` သာ။ ချဲ့ပါက `company_id` column + RLS policy လိုအပ်မည်။ မချဲ့ပါက company-specific correction များကို **ingest မလုပ်ဘဲထားရမည်** (consultant ဖြေပေးရုံသာ၊ learn မလုပ်)。 လုံခြုံမှုအရ ရိုးရှင်းသော်လည်း learning coverage ကျဉ်းမြောင်းသည်。
6. **`is_active` / `superseded_by` / `created_by` column များ ထပ်ဖြည့်ရန်** — conflict handling (§Learning Ingestion Rules #3) နှင့် audit အတွက် လိုအပ်သည်။
7. `hr_kb` ၏ RLS policy ၀ ခုဖြစ်နေခြင်းကို **intentional အဖြစ်အတည်ပြုရန်** — လက်ရှိတွင် service_role သာဝင်နိုင်သည် (KB အတွက် မှန်ကန်သော default)。 n8n က service_role ဖြင့်ဝင်မည်ဖြစ်၍ အဆင်ပြေသော်လည်း documented ဖြစ်သင့်သည်。
