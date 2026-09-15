# TASK-002 — HR Consultant RAG Foundation

## Status
ACTIVE

## Spec
`work/specs/SPEC-002-hr-consultant-hitl-learning.md`

## Objective
HR Consultant Agent ၏ RAG layer အတွက် knowledge schema တည်ဆောက်ပြီး၊ ရှိပြီးသား `Resources` content ကို ingest လုပ်ကာ၊ **မြန်မာစာ retrieval quality ကို တိုင်းတာ၍ evidence ထုတ်ရန်**။ ဤ benchmark ရလဒ်သည် SPEC-002 ၏ pre-implementation gate ဖြစ်ပြီး၊ review loop (TASK-003) ကို မတည်ဆောက်မီ ဖြတ်ကျော်ရမည်။

## In Scope
- `knowledge_entries` table schema (migration proposal အဆင့်)
- `Resources` ၂၂၄ ခု၏ `description` + `detail_info` text ကို ingest
- Embedding pipeline (`gemini-embedding-001`, MRL truncate → 1536)
- Retrieval query (company scope rule အပါအဝင်)
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
- [ ] `knowledge_entries` schema သည် SPEC-002 ၏ field များ (scope, company_id, question/answer split, is_active, superseded_by) ကို support လုပ်သည်
- [ ] `Resources` content ၂၂၄ ခု ingest ပြီးစီးပြီး embedding ရှိသည်
- [ ] Embedding dimension = 1536 ဖြစ်ပြီး pgvector index တည်ဆောက်၍ရသည်
- [ ] Retrieval query သည် company scope rule ကိုလိုက်နာသည် (`general` + ကိုယ့် company ၏ `company_policy` သာ)
- [ ] Cross-company negative test: အခြား company ၏ `company_policy` entry မပြန်ရ
- [ ] **မြန်မာစာ query များအတွက် top-5 hit rate ကို တိုင်းတာပြီး မှတ်တမ်းတင်ထားသည်**
- [ ] English query များအတွက်လည်း တူညီစွာတိုင်းတာထားသည်
- [ ] Hit rate နိမ့်ပါက alternative embedding model အနည်းဆုံးတစ်ခုနှင့် နှိုင်းယှဉ်ပြီး ADR draft ရေးထားသည်

## Verification Evidence
`work/reviews/TASK-002-retrieval-benchmark.md` တွင် —
- Query set (မြန်မာ + English), expected relevant entry, actual top-5 result
- Hit rate ဂဏန်း
- Cross-company negative test ရလဒ်
- Model နှိုင်းယှဉ်ချက် (လိုအပ်ပါက)

## Completion Gate
Benchmark evidence မရှိဘဲ `COMPLETED` မသတ်မှတ်ရ။ Hit rate ကောင်း/မကောင်း မည်သို့ပင်ဖြစ်စေ ရလဒ်ကို မှတ်တမ်းတင်ရမည် — မကောင်းပါက ၎င်းသည် TASK-003 မစမီ ဖြေရှင်းရမည့် blocker ဖြစ်သည်။
