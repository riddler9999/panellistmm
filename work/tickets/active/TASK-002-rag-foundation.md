# TASK-002 — HR Consultant RAG Foundation

## Status
ACTIVE

## Spec
`work/specs/SPEC-002-hr-consultant-hitl-learning.md`

## Objective
HR Consultant Agent ၏ RAG layer အတွက် knowledge schema တည်ဆောက်ပြီး၊ ရှိပြီးသား `Resources` content ကို ingest လုပ်ကာ၊ **မြန်မာစာ retrieval quality ကို တိုင်းတာ၍ evidence ထုတ်ရန်**။ ဤ benchmark ရလဒ်သည် SPEC-002 ၏ pre-implementation gate ဖြစ်ပြီး၊ review loop (TASK-003) ကို မတည်ဆောက်မီ ဖြတ်ကျော်ရမည်။

## In Scope
- ရှိပြီးသား `public.hr_kb` schema ကို SPEC-002 လိုအပ်ချက်နှင့် gap analysis (table အသစ်မဆောက်ရ)
- `Resources` ၂၂၀ ခု၏ `description` + `detail_info` text ကို ingest
- Embedding pipeline (`gemini-embedding-001`, MRL truncate → 1536)
- Retrieval query
- **Burmese + English retrieval benchmark နှင့် hit-rate evidence**

## Out of Scope
- Review loop UI / state machine (TASK-003)
- Correction ingestion (TASK-003)
- Google Drive document extraction
- Discovery routing (TASK-001 — backlog)
- Production deployment / production migration apply

## Relevant Context
- `work/specs/SPEC-002-hr-consultant-hitl-learning.md`
- `.ai-architect/decisions/ADR-002-glide-data-model-baseline.md` (Proposed)
- `platforms/supabase/` — schema, RLS, migration gate
- `project/REQUIREMENTS.md` — company scoping, deterministic validation

## Expected Changes
- `supabase/` — `knowledge_entries` migration (owner approval ရပြီးမှ apply)
- `workflows/` သို့မဟုတ် script — ingestion + embedding pipeline
- `work/reviews/TASK-002-retrieval-benchmark.md` — benchmark evidence

## Acceptance Criteria
- [x] **မြန်မာစာ query များအတွက် hit rate ကို တိုင်းတာပြီး မှတ်တမ်းတင်ထားသည်** — R@5 = 1.00 (self-retrieval), real question ၁၂ ခုတွင် ၁၀ ခု top-1 တိကျ
- [x] English query များနှင့် နှိုင်းယှဉ်ထားသည် — မြန်မာ ≈ 0.673 vs English ≈ 0.674 top-1 similarity, deficit မရှိ
- [x] Embedding dimension = 1536 အတည်ပြုပြီး — `hr_kb.embedding` သည် `vector(1536)` ဖြစ်ပြီး HNSW cosine index ရှိပြီးသား
- [x] ရှိပြီးသား `hr_kb` schema ကို SPEC-002 နှင့် gap analysis လုပ်ပြီး (SPEC-002 §Supabase — RAG corpus)
- [x] `hr_kb` gap များအတွက် additive migration owner approve ပြီး apply ပြီး — `hr_kb_hitl_learning_loop_support`
- [x] Ingest blocker bug ဖြေရှင်းပြီး — `source_type = 'sop'` ကို CHECK တွင်ထည့်ပြီး (`hr_kb_allow_sop_source_type`)
- [ ] `KB Bulk Ingest` workflow ၏ Postgres credential wire လုပ်ပြီး node ၃ ခု enable လုပ်သည်
- [ ] SOP ၁၂ + FAQ ၅၀ ကို `hr_kb` ထဲ ingest ပြီးစီးပြီး embedding ရှိသည်
- [ ] Ingestion သည် `chunk_hash` dedup ကိုလိုက်နာသည် (ထပ် run ရင် duplicate row မဖြစ်ရ)
- [ ] Ingest ပြီးသော data ဖြင့် retrieval query end-to-end အလုပ်လုပ်သည်

## လုပ်ဆောင်ချက် ပြောင်းလဲမှု (2026-09-15)
ဤ ticket သည် မူလက ingestion pipeline အသစ်ဆောက်ရန်ဖြစ်ခဲ့သည်။ n8n တွင် `KB Bulk Ingest — Drive SOP + FAQ` workflow ရှိပြီးသားဖြစ်ကြောင်းတွေ့ရှိသဖြင့် — owner decision အရ **၎င်းကိုပြီးအောင်လုပ်မည်**၊ အသစ်မဆောက်တော့ပါ (`platforms/n8n/INVENTORY.md`)。 ထို့အတူ corpus သည် Glide `Resources` ၂၂၀ (template များ) မဟုတ်တော့ဘဲ SOP ၁၂ + FAQ ၅၀ (advice content) ဖြစ်သည် — benchmark တွင်တွေ့ခဲ့သော corpus gap ကို ပိုကောင်းစွာဖြည့်ပေးသည်。

## Verification Evidence
`work/reviews/TASK-002-retrieval-benchmark.md` တွင် —
- Query set (မြန်မာ + English), expected relevant entry, actual top-5 result
- Hit rate ဂဏန်း
- Cross-company negative test ရလဒ်
- Model နှိုင်းယှဉ်ချက် (လိုအပ်ပါက)

## Completion Gate
Benchmark evidence မရှိဘဲ `COMPLETED` မသတ်မှတ်ရ။ Hit rate ကောင်း/မကောင်း မည်သို့ပင်ဖြစ်စေ ရလဒ်ကို မှတ်တမ်းတင်ရမည် — မကောင်းပါက ၎င်းသည် TASK-003 မစမီ ဖြေရှင်းရမည့် blocker ဖြစ်သည်။
