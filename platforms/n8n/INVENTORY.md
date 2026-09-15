# n8n Workflow Inventory (Panellist)

လက်ရှိ n8n instance ပေါ်တွင်ရှိသော Panellist workflow များ၏ verified snapshot။ ဤ repo သည် ကာလတစ်ခုအထိ ဤ implementation layer ကို မှတ်တမ်းမတင်ခဲ့ပါ — `agent/RULES.md` ၏ "Repository state ... outrank summaries" invariant အရ **n8n instance သည် workflow behavior အတွက် ground truth ဖြစ်ပြီး ဤဖိုင်သည် index သာဖြစ်သည်**။

**Last verified**: 2026-09-15
**Project folder**: `pqhGc7TBjp6NzsbX`

## Part 1 — HR Consultant / RAG

| Workflow | ID | Active | မှတ်ချက် |
|---|---|---|---|
| `HR Consultant Agent` | `oWB6VGMxXPT0uzI7` | ✅ | Part 1 agent |
| `Panellist Support Agent (HR)` | `F1UeLKfFHFqk5sL9` | ✅ | Telegram HR agent, Gemini + 20-msg memory, **strict no-RAG guardrails** (RAG မတိုင်မီ version) |
| `KB Upsert/Delete` | `xYcyj8ziIj78p8lT` | ❌ | "Part 1 Phase 1" — Glide KB_Articles write path。 Webhook(header auth) → Switch(upsert/delete/reconcile) → Zawgyi→Unicode→NFC → chunk+sha256 → `gemini-embedding-001` @1536 → hr_kb upsert/purge |
| `KB Bulk Ingest — Drive SOP + FAQ` | `ZW7ujgnoQrT7IYex` | ❌ | One-time bulk seed。 အောက်တွင်အသေးစိတ် |

## Part 3 — SOP / Org Chart

| Workflow | ID | Active | မှတ်ချက် |
|---|---|---|---|
| `Panellist Document Architect v3` | `gB6WtsJVibehCAot` | ✅ | Contract-first Telegram workflow — discovery, SOP/Org `.drawio`, HR Form `.xlsx` |
| `Panellist Drawio Renderer — Agent Tool` | `y05dDLnUrz69g7FM` | ✅ | Contract validation → Draw.io XML → artifact storage → `.drawio` links |
| `Panellist Drawio Artifact Download` | `fl1FjM3XlBi7RMQW` | ✅ | Opaque-key download endpoint |
| `Panellist SOP — Render PNG & Send Telegram` | `iM2xp8YzretxNBVq` | ✅ | ⚠️ PNG render — ADR-001 နှင့်ဆက်စပ်၍ အောက်တွင်ကြည့်ပါ |
| `Panellist SOP/Org — Discovery Agent (build/test)` | `jiHDDozQlmwcVayU` | ✅ | build/test, dummy data |
| `Panellist SOP/Org Generator` | `ZdpBh1GCKZW7iVTC` | ❌ | Part 3 generation tester |
| `Panellist Business Discovery → SOP/OG/Form (v2)` | `EBkA5VBqMKJcuk0V` | ❌ | |
| `Panellist SOP/Org — Generation Core (build/test)` | `670JVU6g6i5oakFc` | ❌ | |
| `Panellist Renderer — VPS Probe` | `v8UJLkLMoQ1rnwlG` | ❌ | ops probe |
| `Panellist SOP/Org — Renderer Deploy (ops)` | `a8GzSEycNhbiUihp` | ❌ | ops deploy |

## `KB Bulk Ingest — Drive SOP + FAQ` — အသေးစိတ်

Node ၂၅ ခု၊ manual trigger၊ inactive。 Corpus နှစ်မျိုး —
- **SOP**: Google Drive မှ HR SOP docx ၁၂ ခု (Recruitment & Selection, Employee Orientation, Probation Period Review, Personal File Management, Internal Transfer, Annual Performance Appraisal, Attendance Tracking, Payroll Calculation, Exit/Resignation, Dismissal, Exit Interview, Grievance & Disciplinary) — bilingual split
- **FAQ**: `hr-consulting-qa` record ၅၀ (မြန်မာလို HR advice Q&A)

Pipeline: Drive docx → Google Doc copy → plain-text export → bilingual split → **Zawgyi detect/convert + NFC normalize** → chunk + sha256 → `gemini-embedding-001` @1536 → `hr_kb` upsert (`ON CONFLICT (source_id, chunk_hash)`) + stale-chunk purge → global reconcile。

Credentials wired: `Google Drive account 2` (`bHh55IupgMJpCVKl`), `mhtet` googlePalmApi (`2iYmjZMBFtEPACDN`)。

`source_id` format: `sop:<driveFileId>:<language>` / `faq:<knowledge_id>` — `hr_kb_source_id_matches_type` constraint နှင့်ကိုက်ညီသည်。

### Blockers
1. ✅ **ဖြေရှင်းပြီး** — `source_type = 'sop'` သည် `hr_kb_source_type_check` တွင်မပါသဖြင့် SOP upsert တိုင်း fail ဖြစ်မည်ဖြစ်သည်။ Migration `hr_kb_allow_sop_source_type` ဖြင့် `'sop'` ကိုထည့်ပြီး。 (Workflow ကို တစ်ခါမှ run မဖူးသေး၍ ဤ bug ပေါ်မလာခဲ့ပါ。)
2. ✅ **ဖြေရှင်းပြီး** — Postgres node ၃ ခုတွင် credential မရှိဘဲ disabled ဖြစ်နေခဲ့သည်။ `Panellst` credential (`j1mRvDCfnGpgDZPN`) ကို wire လုပ်ပြီး enable လုပ်ပြီး。
3. 🔴 **ဖွင့်ထားဆဲ — `Panellst` credential သည် မှားသော database သို့ညွှန်နေသည်**

   Execution `62223` (2026-09-15) သည် status `success` ပြသော်လည်း row ၀ ခုသာရေးသည်။ Upsert node နှစ်ခုစလုံး၏ error-output branch တွင် —
   ```
   relation "public.hr_kb" does not exist
   ```
   RLS, permission သို့မဟုတ် schema ပြဿနာမဟုတ်ပါ (တူညီသော INSERT ကို `postgres` role ဖြင့်တိုက်ရိုက် run ရာ အောင်မြင်သည်) — credential သည် `hr_kb` မရှိသော database တစ်ခုသို့ချိတ်နေခြင်းဖြစ်သည်。

   မျှော်မှန်းထားသော connection —
   | Field | Value |
   |---|---|
   | Host | `db.apnvkmwcmfpkkifzmdfc.supabase.co` (သို့) ap-southeast-2 pooler host |
   | Port | `5432` (pooler ဆိုလျှင် `6543`) |
   | Database | `postgres` |
   | User | `postgres` (pooler ဆိုလျှင် `postgres.apnvkmwcmfpkkifzmdfc`) |
   | SSL | require |

   ⚠️ **Silent-failure သတိပေးချက်** — upsert node များ၏ error ကို `Collect Ingest Errors` သို့ route လုပ်ထားသဖြင့် **execution status မှာ `success` ပြသည်**。 ထို့အပြင် `Collect Ingest Errors` သည် Postgres error ၏ အကြောင်းရင်းကို မသိမ်းဘဲ SQL text သာသိမ်းသည် — အမှန်တကယ့်အကြောင်းရင်းသည် node ၏ error-output branch (`data.main[1]` ၏ `.json.message`) တွင်သာရှိသည်。 **Run တစ်ခုပြီးတိုင်း `hr_kb` row count ကိုတကယ်စစ်ရမည်၊ execution status ကိုမယုံရ。**

### Verified working (execution `62223`)
DB write မှလွဲ၍ pipeline တစ်ခုလုံးအောင်မြင်သည် — Drive docx copy/export, bilingual split, Zawgyi detect/convert + NFC normalize, chunk + sha256, `gemini-embedding-001` @1536 embedding အားလုံး error မရှိ。

## ⚠️ ADR-001 နှင့် ဆက်စပ်၍ စစ်ဆေးရန်

`Panellist SOP — Render PNG & Send Telegram` သည် active ဖြစ်ပြီး PNG render လုပ်သည်။ ADR-001 က `.drawio` ကို canonical အဖြစ်သတ်မှတ်ပြီး "PNG generation သည် default production path မဟုတ်ရ" ဟုဆိုထားသည်။

`Panellist Drawio Renderer` နှင့် `Drawio Artifact Download` လည်း active ဖြစ်နေသဖြင့် — PNG သည် ADR-001 ခွင့်ပြုထားသော **secondary derived artifact** ဖြစ်နေခြင်းလား၊ သို့မဟုတ် **parallel canonical path** ဖြစ်နေခြင်းလား ဆုံးဖြတ်ရန်လိုအပ်သည်။ ဒုတိယဖြစ်ပါက ADR-001 ချိုးဖောက်မှုဖြစ်သည်。

## Terminology

Owner သည် **"Part 1 / Part 3"** ကိုသုံးသည် — ၎င်းသည် `project/ROADMAP.md` ၏ **"Phase 0–5"** နှင့် မတူပါ。

| Owner term | အကြောင်းအရာ | Roadmap phase |
|---|---|---|
| Part 1 | HR Consultant agent + RAG | Phase 2 |
| Part 3 | SOP + Org Chart generation | Phase 3 + 4 |

"Part 2" ကို owner မှ မရှင်းပြရသေးပါ。
