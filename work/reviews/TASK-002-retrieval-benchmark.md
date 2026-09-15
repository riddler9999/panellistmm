# TASK-002 — Retrieval Benchmark Evidence

## Status
✅ **GATE PASSED** — `gemini-embedding-001` @ 1536 dim သည် ဤ bilingual corpus အတွက် လုံလောက်သော retrieval quality ပေးသည်။ TASK-003 (review loop) သို့ ဆက်သွားနိုင်သည်။

## Test Setup

| အချက် | တန်ဖိုး |
|---|---|
| Model | `gemini-embedding-001` |
| Dimension | 1536 (MRL truncation via `outputDimensionality`) |
| Task types | corpus = `RETRIEVAL_DOCUMENT`, query = `RETRIEVAL_QUERY` |
| Similarity | cosine (L2-normalized dot product) |
| Corpus | Glide `Resources` ၂၂၀ entry — `name + category + description` |
| Corpus language | ၂၂၀ ထဲ ၈၆ ခုတွင် မြန်မာစာပါဝင် |
| Execution | Local (database မထိရ) — API connectivity နှင့် model quality ကိုသာစစ်သည် |

Test သည် Supabase ကို လုံးဝမထိပါ — schema migration မလုပ်မီ model ရွေးချယ်မှုကို အတည်ပြုရန်သာဖြစ်သည်။

## Test 1 — Self-retrieval (ground truth ရှိသည်)

**နည်းလမ်း**: corpus entry = `name + category + description`၊ query = တူညီသော resource ၏ `detail_info` (စာသားကွဲပြားသည်)။ ထို့ကြောင့် target ကို သိရှိပြီးဖြစ်သည်။

| Language | n | Recall@1 | Recall@5 | Recall@10 | Median rank |
|---|---|---|---|---|---|
| မြန်မာ | 40 | 0.75 | **1.00** | 1.00 | 1 |
| English | 0 | — | — | — | — |

⚠️ **ကန့်သတ်ချက်နှစ်ခု**:
1. `detail_info` ရှိသော resource အားလုံး မြန်မာစာဖြစ်နေသဖြင့် **English control မရရှိပါ**။
2. Resource အချို့တွင် `description` နှင့် `detail_info` သည် near-duplicate ဖြစ်နေသည် (ဥပမာ — "ဝန်ထမ်းဦးရေ ကို ပြသသည့် report template" vs "ဝန်ထမ်းဦးရေ ကို ပြသသည့် reporting template ဖြစ်ပါသည်။")။ ထို့ကြောင့် ဤရလဒ်သည် **optimistic ဖြစ်နိုင်ပြီး** semantic retrieval ထက် lexical matching ကို တိုင်းမိနေနိုင်သည်။

ဤကန့်သတ်ချက်များကြောင့် Test 2 ကို ထပ်လုပ်သည်။

## Test 2 — Real ticket questions (ပိုခက်၊ ပို representative)

**နည်းလမ်း**: Export ထဲမှ ticket question ၁၂ ခု (မြန်မာ ၅ + English ၇) ကို corpus နှင့် lexical overlap မရှိဘဲ query အဖြစ်သုံးသည်။ Labelled ground truth မရှိသဖြင့် topical relevance ကို လူကဆုံးဖြတ်သည်။

| Lang | Question (အတို) | Top-1 result | Sim | ဆီလျော်မှု |
|---|---|---|---|---|
| my | orientation SOP လိုချင်သည် | Orientation SOP | 0.796 | ✅ တိကျ |
| my | EC Contract နမူနာ | Employment Aggreement | 0.663 | ✅ cross-lingual |
| my | ဝန်ထမ်းထွက်၊ Senior မသင်ပေး | Resignation SOP | 0.608 | ✅ (top-5 တွင် Orientation SOP, HR Training ပါ) |
| my | Sales turnover rate မြင့် | Headcount Report | 0.615 | ⚠️ generic |
| my | HR Dept မရှိ၊ ဝန်ထမ်း ၆၀ | HR Budget Expenses | 0.681 | ⚠️ generic |
| en | Finance manager candidate ရှာမရ | Recruitment and Selection | 0.633 | ✅ တိကျ |
| en | increment မကျေနပ်၍ resign | Resignation SOP | 0.635 | ✅ တိကျ |
| en | probation SOP | Probation Period Review SOP | 0.764 | ✅ တိကျ |
| en | new employee adapt SOP | Orientation SOP | 0.736 | ✅ တိကျ |
| en | resign during probation | Probation Policy | 0.635 | ✅ တိကျ |
| en | increment for under-performer | Increment Letter | 0.637 | ✅ တိကျ |
| en | child care leave policy | Leave Policy | 0.679 | ✅ တိကျ |

**ရလဒ်: ၁၂ ခုအနက် ၁၀ ခု top-1 တိကျ။ ၂ ခု generic (အောက်တွင်ရှင်းပြ)။**

## 🔑 အဓိက Finding — မြန်မာစာ deficit မရှိပါ

| Language | Top-1 similarity ပျမ်းမျှ (Test 2) |
|---|---|
| မြန်မာ | ≈ 0.673 |
| English | ≈ 0.674 |

နှစ်ခုနီးပါးတူညီသည်။ Benchmark ၏ မူလရည်ရွယ်ချက်မှာ **မြန်မာစာအတွက် သီးသန့် quality ကျဆင်းမှုရှိ/မရှိ** ကိုရှာရန်ဖြစ်ပြီး — **မတွေ့ရပါ**။

ပိုအရေးကြီးသည်မှာ **cross-lingual retrieval အလုပ်လုပ်သည်** — မြန်မာလိုမေးသော "EC Contract နမူနာ" query သည် English title ရှိသော "Employment Aggreement" document ကို top-1 ရှာတွေ့သည်။ Corpus သည် bilingual ဖြစ်ပြီး user များသည် ဘာသာစကားနှစ်မျိုးလုံးဖြင့်မေးမည်ဖြစ်၍ ဤ capability သည် မရှိမဖြစ်လိုအပ်သည်။

## ⚠️ ဒုတိယ Finding — Corpus gap (model ပြဿနာမဟုတ်)

Generic ရလဒ်ထွက်သော question ၂ ခု (Sales turnover, HR Department setup) သည် **broad strategic question** များဖြစ်သည်။ ၎င်းတို့အတွက် သက်ဆိုင်ရာ document မတွေ့ရခြင်းမှာ retrieval failure မဟုတ်ဘဲ — **corpus ထဲတွင် အဲ့ဒီလို content မရှိ၍ဖြစ်သည်**။

`Resources` ၂၂၀ သည် template, form, letter, SOP, dashboard စာရွက်များဖြစ်ပြီး **advice content မဟုတ်ပါ**။ HR Consultant Agent သည် strategic question များကို document retrieval တစ်ခုတည်းဖြင့် မဖြေနိုင်ပါ။

**ဤအချက်က correction learning loop (SPEC-002) ၏ တန်ဖိုးကို သက်သေပြသည်** — consultant များ၏ correction များသည် template corpus တွင်မရှိသော **advice layer** ကို တဖြည်းဖြည်းဖြည့်ပေးမည်ဖြစ်သည်။ Day-1 တွင် agent သည် template ရှာပေးရာတွင်သာကောင်းပြီး၊ advice ပိုင်းတွင် consultant correction များစုလာမှသာ ကောင်းလာမည်။ ၎င်းသည် မျှော်မှန်းထားသည့်အတိုင်းဖြစ်ပြီး loop ၏ရည်ရွယ်ချက်လည်းဖြစ်သည်။

## Reproduction

Benchmark script များကို session scratchpad တွင်ထားသည် (repo ထဲမသွင်းပါ — API key handling ပါဝင်သောကြောင့်)။ ပြန်လုပ်ရန် —

1. Glide export မှ `Resources` sheet ကို `{name, category, description, detail}` JSON အဖြစ်ထုတ်
2. `gemini-embedding-001`၊ `outputDimensionality=1536`၊ `batchEmbedContents` endpoint
3. Corpus ကို `RETRIEVAL_DOCUMENT`, query ကို `RETRIEVAL_QUERY` task type ဖြင့် embed
4. L2-normalize ပြီး cosine similarity ဖြင့် rank

## ဆက်လက်လုပ်ဆောင်ရန်

1. ✅ Embedding model ရွေးချယ်မှု အတည်ပြုပြီး — `gemini-embedding-001` @ 1536
2. Corpus gap ကို TASK-003 planning တွင် ထည့်သွင်းစဉ်းစားရန် (agent သည် retrieval မရသည့်အခါ `ai_confidence = low` ပြရမည် — SPEC-002 §Agent Behavior Requirements #3 တွင်ပါပြီးဖြစ်သည်)
3. Production ingestion ပြီးနောက် real query များဖြင့် benchmark ကို ပြန်လုပ်ရန်
