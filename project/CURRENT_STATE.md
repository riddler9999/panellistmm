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

## Verified Infrastructure
- Supabase project **`Panellist`** (`apnvkmwcmfpkkifzmdfc`, ap-southeast-2, Postgres 17.6)
- `public.hr_kb` table ရှိပြီးသား — `vector(1536)` + HNSW cosine index, `(source_id, chunk_hash)` unique dedup, `source_type` တွင် `admin_correction` ပါဝင်ပြီး၊ rows 0, RLS enabled/policy ၀ (service_role သာ)
- `vector` extension 0.8.2 installed
- Migration history: `20260909184210_hr_kb_pgvector_schema` တစ်ခုတည်း

## Blockers
`TASK-002` ၏ retrieval benchmark gate **ကျော်ပြီးဖြစ်သည်** (`work/reviews/TASK-002-retrieval-benchmark.md`)。 လက်ရှိ blocker မှာ — `hr_kb` ၏ gap များ (answer field, scope extension, is_active/superseded_by, created_by) အတွက် **additive migration ကို owner approve လိုအပ်သည်** (SPEC-002 Open Items §4–7)。

## Next
1. `hr_kb` gap များအတွက် migration ကို owner နှင့်အတူ ဆုံးဖြတ်မည်။
2. `Resources` ၂၂၀ ကို `hr_kb` ထဲ ingest မည်။
3. Review loop (TASK-003) ကို ticket အဖြစ်ဖွင့်မည်။
4. Supabase migration ကို owner approval မရှိဘဲ apply မလုပ်ရ။

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
