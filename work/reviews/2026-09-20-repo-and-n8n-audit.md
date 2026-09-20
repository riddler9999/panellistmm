# Repo + n8n Audit — 2026-09-20

> Recorded on 2026-09-20 (Asia/Yangon). ဤဖိုင်သည် inspection/audit evidence သာဖြစ်သည် — n8n workflow၊ Glide setting၊ Supabase data သို့မဟုတ် credential တစ်ခုကိုမျှ **မပြောင်းထားပါ**။ `agent/RULES.md` invariant အရ n8n instance + Supabase သည် runtime ground truth ဖြစ်ပြီး ဤ audit သည် live state ကို repo documentation နှင့် တိုက်ဆိုင်စစ်ဆေးထားခြင်းဖြစ်သည်။

## Scope

- Repository (`riddler9999/panellistmm`) documentation layer တစ်ခုလုံး
- Live n8n instance (`n8n.srv1695682.hstgr.cloud`) ရှိ Panellist workflow ၁၈ ခု + connected n8n Agents
- Cross-check: repo docs (`SPEC-002`, `CURRENT_STATE.md`, `INVENTORY.md`, ADR-001) vs live runtime

## Executive Summary

Live n8n implementation သည် repo documentation ထက် **သိသိသာသာ ရှေ့ရောက်နေပြီး (drift ကြီးမား)**၊ ပိုအရေးကြီးသည်မှာ **repo ၏ core governance invariant — "production HR consultation သည် 100% HITL" — ကို live system တွင် enforce မလုပ်ထားပါ**။ RAG/routing architecture ကိုယ်တိုင်က engineering quality မြင့်သည် (strict validation, prompt-injection guardrails, deterministic routing)၊ သို့သော် production-readiness gap များ (auth, HITL enforcement, PII posture, credential governance) ရှိနေသည်။

Severity အလိုက် အနှစ်ချုပ် —

| # | Finding | Severity | Area |
|---|---|---|---|
| 1 | HITL gate live system တွင် enforce မလုပ်ထား — AI draft တိုက်ရိုက် answer ဖြစ်နေ | 🔴 Critical | Governance / Safety |
| 2 | Routing Model က မတည်ရှိသော model ID `models/gemini-3.7-flash` သုံးထား | 🔴 High | Correctness / Reliability |
| 3 | `panellist-unified` webhook တွင် authentication မရှိ (public POST → paid LLM) | 🔴 High | Security / Cost |
| 4 | Documentation drift ကြီးမား — `INVENTORY.md`/`CURRENT_STATE.md` stale | 🟠 High | Evidence-first invariant |
| 5 | HR PII သည် Google Sheet bridge မှတစ်ဆင့် production တွင် active စီးဆင်းနေ — privacy gate မဖြတ်ရသေး | 🟠 High | Privacy / Compliance |
| 6 | `company_id` multi-tenant isolation ကို enforce မလုပ်ထား | 🟡 Medium | Security |
| 7 | Credential ownership fragmented (personal Google/Telegram account အများ) | 🟡 Medium | Operational risk |
| 8 | Dedup guard က "drafted" နှင့် "answered" ကို conflate လုပ်နေ | 🟡 Medium | Correctness |

---

## Finding 1 — HITL gate is not enforced in the live system 🔴 Critical

**Contract (repo):**
- `SPEC-002.md` §State Machine invariant: *"`Pending Review` သို့မဟုတ် `AI Drafting` state ရှိစဉ် client သည် draft answer ကို လုံးဝမမြင်ရ"*၊ `final_answer` သာ client-visible field ဖြစ်ရမည်။
- `CURRENT_STATE.md`: *"Production HR consultation remains 100% HITL: User request → RAG-grounded AI draft → consultant review/edit/approve → final delivery."*

**Live reality:**
- `Process pending Glide Panellist requests` (`I01u0vd30Db7xSfx`, **active**, schedule trigger every 5 min) သည် pending row တိုင်းကို `Call Unified Orchestrator` သို့ပို့ပြီး၊ ရလာသော AI answer ကို `Write AI Draft to Source Row` node ဖြင့် Google Sheet ၏ **`AI_Answer` column သို့ တိုက်ရိုက်ရေးသည်** — consultant review step မပါ။
- `Panellist Unified Orchestrator` (`97Hrjp3aKOLIR4wJ`) သည် `Call HR Consultant Agent` (messageAnAgent) ကို တိုက်ရိုက်ခေါ်ပြီး reply ကို `status: completed` အဖြစ် ချက်ချင်းပြန်ပေးသည် — review gate မရှိ။
- `2026-09-19` worklog ၏ Glide inspection: Button Block နှင့် Consultant editing field များတွင် **Visibility Condition မရှိ** — normal user များသည် unapproved answer/controls ကို မြင်နိုင်သည်။ `Approve` action သည် `Ticket_Status` ကိုလည်း မပြောင်း။

**Impact:** RAG-grounded သော်လည်း **un-reviewed, potentially hallucinated HR/legal advice သည် consultant approval မရှိဘဲ end-user ထံ ရောက်နိုင်သည်**။ ၎င်းသည် SPEC-002 ၏ အဓိကရည်ရွယ်ချက်နှင့် `CURRENT_STATE.md` ၏ production gate ကို တိုက်ရိုက်ချိုးဖောက်သည်။

**Recommendation (owner approval gate — implementation မလုပ်ရသေး):**
1. AI output ကို consultant-only field (`ai_draft_answer`) သို့သာ ရေးရန်။ `AI_Answer`/`Final_Answer` client-visible path ကို consultant approve/edit ပြီးမှသာ ဖြည့်ရန်။
2. Glide တွင် draft field + review controls များကို Admin/Consultant role အတွက်သာ visible လုပ်ရန် (row-owner/role visibility)။
3. Normal user အတွက် `Final_Answer` ရှိမှသာ answer ပြရန်။
4. Field naming canonical တစ်ခုသတ်မှတ်ရန် (`AI_Answer` vs `Sheet_AI_Answer` vs `final_answer` drift ရှိနေသည် — worklog §Contract reconciliation)။

---

## Finding 2 — Routing Model uses a non-existent model ID 🔴 High

`Panellist Unified Orchestrator` → `Routing Model` node သည် `modelName: "models/gemini-3.7-flash"` ကိုသုံးထားသည်။ ဤ model ID သည် Google Gemini lineup တွင် မတည်ရှိပါ (real ids: `gemini-2.0-flash`, `gemini-2.5-flash` စသည်)။ Semantic Capability Router တစ်ခုလုံးသည် ဤ model ပေါ်တွင်မူတည်နေသဖြင့် —

- `retryOnFail: true, maxTries: 3` ဖြင့် retry လုပ်သော်လည်း invalid model သည် transient error မဟုတ်၍ retry အားလုံး fail ဖြစ်နိုင်သည်။
- Fail ဖြစ်ပါက routing မဖြစ်တော့ဘဲ orchestrator တစ်ခုလုံး blocked ဖြစ်နိုင်သည်။

**Recommendation:** production-supported Gemini model ID (`get_node_types` / provider list မှ verified) ဖြင့်အစားထိုးပြီး test route တစ်ခုဖြင့် အတည်ပြုရန်။ `ARCHITECTURE.md:11` အရ model ကို invariant အဖြစ်မ lock ရ — သို့သော် **တည်ရှိသော model** ဖြစ်ရမည်။

---

## Finding 3 — Public webhook with no authentication 🔴 High

`panellist-unified` webhook (`97Hrjp3aKOLIR4wJ`) — *"No credentials required for this webhook"*၊ poller သည်လည်း `authentication: none` ဖြင့်ခေါ်သည်။

- ၎င်းသည် **public POST endpoint** ဖြစ်ပြီး၊ ခေါ်လိုက်တိုင်း paid Gemini call + n8n Agent dispatch ကို trigger လုပ်သည်။
- URL သိသူတိုင်း cost-inducing request များ (denial-of-wallet) ပို့နိုင်သည်။
- `platforms/n8n/WORKFLOW-RULES.md`: *"Webhook contracts ... ကို explicit လုပ်ရမယ်"*၊ `KB Upsert/Delete` သည် header auth သုံးထားသည် — orchestrator သည် ထို standard ကို မလိုက်နာပါ။

**Recommendation:** header-auth (shared secret) သို့မဟုတ် n8n webhook auth ထည့်ရန်။ Poller ကို credential ဖြင့်ခေါ်ရန်။ Rate limiting / request-size cap ကိုစဉ်းစားရန်။

---

## Finding 4 — Large documentation drift (evidence-first invariant) 🟠 High

`platforms/n8n/INVENTORY.md` သည် **last verified 2026-09-15** ဖြစ်ပြီး၊ "Part 1 / Part 3" workflow set (Document Architect v3, PNG renderer, KB Bulk Ingest စသည်) ကိုသာဖော်ပြထားသည်။ Live n8n (2026-09-19/20) တွင် **entirely new architecture** ရှိနေသည် —

- `Panellist Unified Orchestrator` (capability routing) — **active**
- `Panellist Artifact Architect API` + dedicated renderers (SOP/Org drawio, HR Form XLSX)
- n8n first-class Agents: `Panellist HR Consultant Agent`, `SOP Architect v2`, `Organization Architect v2`, `HR Form Architect v2`
- Artifact KB ingest pair (`Master Ingest v1` / `Source Ingest v1`), category-filtered KB search workflows ၃ ခု
- Google Sheet Glide bridge poller

Contradiction များ —
- `CURRENT_STATE.md`: *"Discovery routing ကို backlog တွင်ထား"* — သို့သော် live Unified Orchestrator က capability/discovery routing ကို **active** လုပ်နေပြီ။
- `INVENTORY.md` ရှိ workflow ID/name အများစုသည် live state နှင့် မကိုက်တော့ (e.g. `oWB6VGMxXPT0uzI7` ယခု `Panellist HR Consultant Intake → Saved Agent` အဖြစ် rename)။

`AGENTS.md` invariant — *"Repository reality outranks saved summaries"* + *"Do not change scope or architecture without explicit human approval"* — အရ ဤ drift ကို reconcile လုပ်ရန်လိုသည်။ လက်ရှိတွင် runtime က repo ကို ကျော်တက်သွားပြီး scope/architecture change (Unified Orchestrator, direct-answer path) များသည် repo docs တွင် approve/record မဖြစ်ရသေးပါ။

**Recommendation:** `INVENTORY.md` ကို live 18-workflow + Agent set ဖြင့် refresh၊ `CURRENT_STATE.md` ၏ "Discovery in backlog" ကို reconcile၊ Unified Orchestrator architecture ကို ADR အဖြစ်မှတ်တမ်းတင်ရန် (owner approval ဖြင့်)။

---

## Finding 5 — HR PII flows through a Google Sheet in production before privacy gate 🟠 High

- `CURRENT_STATE.md` Remaining Gate #4: *"Choose/approve the production model/privacy posture before real HR PII is used."*
- Live: poller သည် **၅ မိနစ်တိုင်း** Google Sheet (`1B6Mo7NU...` — "Panellist HR Tickets Bridge") မှ ticket များ (subject/hr_issue/description/attachments) ကိုဖတ်ပြီး Gemini သို့ပို့ကာ answer ကို Sheet သို့ပြန်ရေးနေသည်။
- HR ticket များတွင် employee PII ပါဝင်နိုင်ပြီး၊ ၎င်းသည် third-party Google Sheet + Google Gemini (personal `maungmoeee` API credential) မှတစ်ဆင့်စီးဆင်းနေသည် — privacy posture approval ၏ evidence မတွေ့ရ။

**Recommendation:** production PII အသုံးမပြုမီ privacy/model posture ကို owner approve ရန်၊ data retention (Sheet ၏ ticket history) နှင့် de-identification boundary ကို သတ်မှတ်ရန်။ SPEC-002 §De-identification သည် correction ingest အတွက်သာ define လုပ်ထား — intake path အတွက်လည်း posture လိုအပ်သည်။

---

## Finding 6 — `company_id` accepted but tenant isolation not enforced 🟡 Medium

Unified Orchestrator က `company_id` ကို validate/slice လုပ်သော်လည်း downstream retrieval/dispatch တွင် isolation အတွက် **မသုံးပါ**။ လက်ရှိ `hr_kb` သည် `scope = 'generic'` သာဖြစ်၍ retrieval သည် corpus-wide ဖြစ်ပြီး ယခုအခြေအနေတွင် leak risk နိမ့်သည်။ သို့သော် `platforms/supabase/SECURITY.md` invariant (*"Multi-company data ရှိလာရင် ... RLS level မှာ enforce"*) အရ၊ company-scoped knowledge/artifact ထည့်မည်ဆိုလျှင် ယခုကတည်းက isolation contract ကို ရှင်းလင်းထားသင့်သည် (SPEC-002 §Retrieval scope rule နှင့်ကိုက်ညီ)။

---

## Finding 7 — Fragmented credential ownership 🟡 Medium

Credential list တွင် workflow များသည် personal account အမျိုးမျိုးပိုင် credential များကိုသုံးထားသည် —
- Google Sheets: `moehtetofficial1`
- Gemini (googlePalmApi): `maungmoeee`
- Google Drive / Supabase / Telegram: `MOE HTET`, `mhtet`, `maungmoegrocery` စသည်

**Operational risk:** production automation သည် personal Google/Telegram account များပေါ်မူတည်နေသည်။ account တစ်ခု token expire/revoke ဖြစ်လျှင် silent failure ဖြစ်နိုင်သည်။ Canonical service account / ownership map ကို `platforms/` တွင်မှတ်တမ်းတင်ပြီး၊ ဖြစ်နိုင်ပါက dedicated service credential သို့ migrate ရန်။

---

## Finding 8 — Poller dedup conflates "drafted" with "answered" 🟡 Medium

`Process pending Glide Panellist requests` ၏ `Keep Pending Requests` filter + `Select One Pending Row per Request` guard သည် `AI_Answer` non-empty ဖြစ်ခြင်းကို "processed" signal အဖြစ်သုံးသည်။ Finding 1 ဖြင့်ပေါင်းလိုက်လျှင် — AI draft ရေးလိုက်သည်နှင့် ticket သည် "answered" ဖြစ်သွားပြီး၊ HITL review အတွက် သီးခြား "drafted-but-not-approved" state မရှိပါ။ HITL fix (Finding 1) လုပ်လျှင် dedup signal ကို `ai_draft_answer` / review-state field သို့ ပြောင်းရမည်။

**Positive note:** poller ၏ error handling သည် ကောင်းသည် — `onError: stopWorkflow` (partial write မဖြစ်စေ)၊ Sheet read/write တွင် `retryOnFail` + backoff၊ orchestrator call တွင် 180s timeout။

---

## What is working well (verified)

- **Unified Orchestrator input validation**: allow-list property check, length caps, `UNKNOWN_PROPERTIES`/`EMPTY_REQUEST` rejection — robust။
- **Prompt-injection guardrails**: Semantic Capability Router ၏ system message တွင် authority hierarchy + untrusted-data handling ရှင်းလင်းစွာသတ်မှတ်ထား။
- **Strict route validation**: LLM output ကို deterministic code (`Strict Route Validator`) ဖြင့် re-validate၊ schema violation → `invalid` route → safe rejection။
- **Deterministic artifact contracts**: SOP/Org/HR Form specialist output ကို `contract_version 2.0` + `document_type` ဖြင့် strict parse၊ invalid → error state (fabrication မခွင့်ပြု)။
- **Separation of concerns**: HR Consultant Internal API (`kZVxvax5MG7BIClj`) သည် Sheet side-effect မရှိ — dual-route အတွက် clean isolation။

---

## Cross-reference: ADR-001 (PNG vs .drawio)

`INVENTORY.md` တွင် flag လုပ်ခဲ့သော `Panellist SOP — Render PNG & Send Telegram` (`iM2xp8YzretxNBVq`) သည် လက်ရှိ Panellist workflow search တွင် **မပေါ်တော့ပါ** (rename/remove ဖြစ်နိုင်)။ Live rendering path (Unified Orchestrator → Drawio Renderer → `.drawio` download link) သည် ADR-001 ၏ canonical `.drawio` posture နှင့် **ကိုက်ညီသည်** — PNG parallel-canonical concern သည် ယခု ဖြေရှင်းပြီးဟုဖြစ်နိုင်။ INVENTORY refresh (Finding 4) တွင် ဤအချက်ကို အတည်ပြုရန်။

---

## Recommended action order

1. **🔴 HITL enforcement (Finding 1)** — owner approval gate; production safety ၏ အဓိက blocker။
2. **🔴 Routing model ID (Finding 2)** — quick fix; orchestrator reliability။
3. **🔴 Webhook auth (Finding 3)** — quick fix; cost/security။
4. **🟠 PII posture approval (Finding 5)** — owner decision။
5. **🟠 Doc reconciliation (Finding 4)** — INVENTORY + CURRENT_STATE + Unified Orchestrator ADR။
6. **🟡 Findings 6–8** — isolation contract, credential map, dedup signal။

## Notes / limits of this audit

- ဤ audit သည် **read-only inspection** ဖြစ်သည်။ Workflow execution history (actual answer content, PII exposure ဖြစ်ခဲ့/မဖြစ်ခဲ့) ကို deep-dive မလုပ်ရသေးပါ — လိုအပ်ပါက execution log review သီးခြားလုပ်သင့်သည်။
- Glide app config ကို 2026-09-19 worklog inspection မှတစ်ဆင့်သာ ကိုးကားထား — live Glide re-inspection မလုပ်ရသေး။
- Supabase RLS/advisor state ကို ဤ round တွင် direct query မလုပ်ရသေး — `hr_kb` RLS-0-policy (service_role only) သည် SPEC-002 §Open Item #7 အရ documented-but-unconfirmed-intentional ဖြစ်နေဆဲ။
