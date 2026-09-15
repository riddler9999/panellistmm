# Current State

## လက်ရှိ Phase
Phase 2 — HR Consultant Agent (RAG foundation)

## အခြေအနေ
Project operating baseline တည်ဆောက်ပြီးဖြစ်သည်။ Owner decision (2026-09-15) အရ Phase 1 (Discovery routing) ကို backlog သို့ရွှေ့ပြီး **HR Consultant Agent နှင့် ၎င်း၏ HITL learning loop** ကို ဦးစားပေးလုပ်ဆောင်မည်။

Pocket HR Glide app ၏ data export နှင့် app-builder recording ကို analyze လုပ်ပြီးဖြစ်သည်။ ⚠️ Pocket HR သည် **development stage** တွင်ရှိပြီး live customer မရှိသေးပါ — export ထဲက user, company, invoice, ticket, chat record များသည် team ကိုယ်တိုင်ရိုက်ထည့်ထားသော demo data ဖြစ်သည်။ ထို့ကြောင့် ၎င်းကို **app configuration / design reference** အဖြစ်သာယူပြီး usage သို့မဟုတ် demand evidence အဖြစ် မယူရ။

## Active Work
- `SPEC-002` — HR Consultant Agent နှင့် HITL learning loop
- `TASK-002` — RAG foundation: knowledge schema, Resources ingestion, **မြန်မာစာ retrieval benchmark**

## Backlog
- `SPEC-001` / `TASK-001` — Discovery routing (content အသင့်ရှိ၊ ပြန်စရန်စောင့်)

## ⚠️ Repo နှင့် Reality ကွာဟမှု (2026-09-15 တွင်တွေ့ရှိ)

ဤ repo သည် ကာလတစ်ခုအထိ "implementation မစသေး" ဟု မှတ်တမ်းတင်ထားခဲ့သည်။ **၎င်းမှားသည်။** n8n instance ပေါ်တွင် Panellist workflow ၁၄ ခုကျော်ရှိပြီး အများစု active ဖြစ်နေသည် — Part 1 (HR Consultant + RAG) နှင့် Part 3 (SOP/Org `.drawio`) နှစ်ခုလုံး တည်ဆောက်ဆဲဖြစ်သည်။ Supabase တွင်လည်း `hr_kb` schema ရှိပြီးဖြစ်သည်။

Inventory: `platforms/n8n/INVENTORY.md` — ဤ repo သည် index သာဖြစ်ပြီး **n8n instance နှင့် Supabase သည် ground truth** ဖြစ်သည်။

## Verified Infrastructure
- Supabase project **`Panellist`** (`apnvkmwcmfpkkifzmdfc`, ap-southeast-2, Postgres 17.6)
- `public.hr_kb` — `vector(1536)` + HNSW cosine index, `(source_id, chunk_hash)` unique dedup, `source_id` သည် `source_type:` ဖြင့်စရမည်ဟူသော constraint ရှိ, rows 0, RLS enabled/policy ၀ (service_role သာ)
- `vector` extension 0.8.2 installed
- Migrations: `hr_kb_pgvector_schema` → `hr_kb_hitl_learning_loop_support` (SPEC-002 columns) → `hr_kb_allow_sop_source_type` (ingest bug fix)

## Terminology
Owner ၏ **Part 1 / Part 3** သည် roadmap ၏ **Phase 0–5** နှင့်မတူ — Part 1 = Phase 2 (HR Consultant + RAG), Part 3 = Phase 3+4 (SOP/Org)。

## Blockers
🔴 **`Panellst` postgres credential သည် မှားသော database သို့ညွှန်နေသည်** — `relation "public.hr_kb" does not exist`。 Credential ကို Panellist Supabase (`apnvkmwcmfpkkifzmdfc`) သို့ပြင်ရန်လိုအပ်သည်။ အသေးစိတ်နှင့် expected connection values: `platforms/n8n/INVENTORY.md`。

⚠️ ဤ run သည် execution status `success` ပြသော်လည်း row ၀ ခုသာရေးခဲ့သည် — **ingest run တိုင်းအပြီး `hr_kb` row count ကို တကယ်စစ်ရမည်**。

ပြီးစီးပြီး —
- Retrieval benchmark gate (`work/reviews/TASK-002-retrieval-benchmark.md`)
- SPEC-002 columns migration (answer_text, is_active, superseded_by, created_by + superseded-not-active constraint)
- `source_type = 'sop'` ingest bug fix

## Next
1. Postgres credential wire ပြီးလျှင် `KB Bulk Ingest` ကို run မည် (SOP ၁၂ + FAQ ၅၀)。
2. Ingest ပြီးနောက် real query များဖြင့် retrieval ကို verify မည်。
3. Review loop (TASK-003) ကို ticket အဖြစ်ဖွင့်မည်。
4. Glide `Resources` ၂၂၀ ကို ingest မလုပ်ရသေး — SOP/FAQ corpus ပြီးမှ ဆုံးဖြတ်မည် (template content ဖြစ်၍ advice corpus ထက် priority နိမ့်သည်)。
5. Supabase migration ကို owner approval မရှိဘဲ apply မလုပ်ရ。

## Relevant Decisions
- SOP နှင့် Org Chart canonical diagram artifact သည် `.drawio` ဖြစ်ရမည် (ADR-001)။
- Glide data model ကို Supabase baseline အဖြစ် map လုပ်ရန် အဆိုပြုထားသည် (ADR-002 — **Proposed**, approval မရသေး)။
- Consultant correction များကို RAG သို့ပြန်သွင်းရာတွင် de-identification လုပ်ရမည်၊ `general` နှင့် `company_policy` ကို ခွဲခြားရမည် (SPEC-002)။
- Embedding: `gemini-embedding-001`, MRL truncate → 1536 dim (pgvector index limit 2000 ကြောင့်)။ Benchmark ဖြင့် အတည်ပြုပြီး — မြန်မာစာ retrieval deficit မရှိ၊ cross-lingual အလုပ်လုပ်သည်။
- RAG corpus အတွက် table အသစ်မဆောက်ဘဲ ရှိပြီးသား `public.hr_kb` ကိုသာသုံးမည်။
- Discovery Agent သည် routing/normalization တာဝန်ယူပြီး specialized agent output ကိုမဖန်တီးရ။
- Material scope/architecture changes အတွက် human approval လိုအပ်သည်။

## Protected Areas
- Production deployment
- Production database destructive operations
- Secrets / credentials
- Approved architecture boundaries

## Last Verified
2026-09-15 — Glide export + app recording analysis ပြီးစီး၊ data provenance (dev-stage demo) အတည်ပြုပြီး၊ owner priority change အရ Phase 2 သို့ပြောင်းထားသည်။ Supabase `Panellist` project schema ကို တိုက်ရိုက်စစ်ဆေးပြီး `hr_kb` ရှိပြီးသားဖြစ်ကြောင်းအတည်ပြုသည်။ Embedding model benchmark gate ကျော်ပြီး။
