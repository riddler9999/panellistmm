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

### Supabase — Core tables

```
knowledge_entries                      -- RAG corpus
  id uuid pk
  source_type text                     -- 'resource' | 'correction'
  knowledge_scope text                 -- 'general' | 'company_policy'
  company_id uuid null                 -- company_policy ဖြစ်မှသာ set
  question_text text                   -- embed လုပ်သည့် field (အောက်တွင်ရှင်းပြ)
  answer_text text                     -- retrieval က return ပြန်သည့် content
  category text                        -- ticket category taxonomy
  language text                        -- 'my' | 'en' | 'mixed'
  embedding vector(1536)               -- gemini-embedding-001, MRL truncated
  is_active boolean default true
  superseded_by uuid null fk -> knowledge_entries.id
  source_ticket_id uuid null
  created_by text                      -- consultant email
  created_at timestamptz

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

### ⚠️ Pre-implementation gate — Burmese retrieval benchmark
မြန်မာစာသည် low-resource language ဖြစ်သည်။ Model ၏ multilingual claim ကို **ဤ corpus အပေါ် verify မလုပ်ဘဲ** RAG တစ်ခုလုံးမတည်ဆောက်ရ။

Implementation မစမီ —
1. `Resources` ၂၂၄ ခု၏ `description` + `detail_info` ကို embed လုပ်
2. Export ထဲမှ real question ~၁၂ ခု (မြန်မာ + English ရောနှော) ဖြင့် retrieve
3. Top-5 hit rate ကိုတိုင်း
4. Hit rate နိမ့်ပါက alternative model (multilingual-e5-large, BGE-M3 စသည်) ကို benchmark လုပ်ပြီး ADR ရေးရန်

ဤ gate မကျော်ဘဲ production RAG မတည်ဆောက်ရ။

### 🔑 ဘာကို embed လုပ်မလဲ — critical design decision
Correction တစ်ခုကို သိမ်းသည့်အခါ **အဖြေတစ်ခုတည်း မသိမ်းရ**။ `(question, answer)` pair အဖြစ်သိမ်းပြီး —

- **Embed လုပ်သည်: `question_text`**
- **Retrieval က return ပြန်သည်: `answer_text`**

အကြောင်းရင်း: incoming query များသည် **မေးခွန်း** ဖြစ်သည်။ Question-to-question similarity သည် question-to-answer similarity ထက် သိသိသာသာပိုတိကျသည် (asymmetric retrieval problem)။ အဖြေကို embed လုပ်ပါက retrieval quality ကျဆင်းပြီး learning loop အလုပ်မလုပ်ပါ။

### Retrieval scope rule
Company `X` ၏ request တစ်ခုအတွက် retrieve လုပ်ရာတွင် —

```sql
WHERE is_active = true
  AND ( knowledge_scope = 'general'
        OR (knowledge_scope = 'company_policy' AND company_id = X) )
```

`company_policy` entry များကို အခြား company သို့ **လုံးဝမပြန်ထုတ်ရ** — privacy အတွက်မဟုတ်ဘဲ **correctness** အတွက်ဖြစ်သည် (Company A ၏ probation policy သည် Company B အတွက် မှားနေသောအဖြေဖြစ်သည်)။

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
