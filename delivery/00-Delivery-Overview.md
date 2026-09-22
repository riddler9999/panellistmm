# 00 — Delivery Overview & Handover Summary

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

ဤ document သည် `<CLIENT_NAME>` အတွက် တည်ဆောက်ပြီးစီးသော **Panellist HR AI System** ကို handover လုပ်ရာတွင် ဘာတွေ deliver လုပ်သည်၊ မည်သူက ဘာတာဝန်ယူသည်၊ acceptance ကို မည်သို့ဆောင်ရွက်မည် ဆိုသည်ကို executive-level ဖြင့် အကျဉ်းချုပ်ဖော်ပြရန်ဖြစ်သည်။

## 2. What is being delivered

Panellist HR AI System သည် HR consultation များကို AI ဖြင့်အထောက်အကူပြုပြီး၊ **human consultant တစ်ဦး၏ approve/edit မပါဘဲ client ထံ answer တစ်ခုမှ မရောက်စေရ** (100% Human-in-the-Loop) ဟူသော production-safety principle ဖြင့်တည်ဆောက်ထားသည်။

Deliver လုပ်သည့် capability များ —

| Capability | ဖော်ပြချက် | Status |
|---|---|---|
| **HR Consultant AI (RAG-grounded)** | HR question များကို approved knowledge base (`hr_kb`) မှ retrieve လုပ်၍ grounded draft answer ထုတ်ပေး | ✅ Tested (n8n) |
| **Human-in-the-Loop review** | Consultant က draft ကို approve/edit ပြီးမှသာ client မြင်ရ | ✅ Contract enforced |
| **SOP & Org Chart generation** | Business discovery မှ `.drawio` SOP / Organization Chart ထုတ်ပေး | ✅ Tested (n8n) |
| **Glide front-end integration** | Glide (Pocket HR) app မှ ticket submit → n8n processing → consultant review | ⏳ Glide ~90% (client-owned) |
| **Auditability & fallbacks** | Deterministic routing, no-match/error/timeout fallback, session isolation | ✅ Tested |

## 3. Delivery scope boundary

| In scope (vendor delivers) | Out of scope |
|---|---|
| n8n workflow orchestration (vendor-hosted) | Glide app UI development (client owns Glide account & app) |
| Supabase schema + knowledge base + RAG retrieval | Multi-company / multi-tenant isolation (not required — see Requirements) |
| AI draft generation + HITL enforcement contract | Client's own OpenRouter account funding (after initial top-up) |
| SOP / Org Chart `.drawio` generation | Autonomous production activation without owner approval |
| This delivery documentation set | Real HR PII processing before privacy posture sign-off (§ Document 05) |

> **Glide note**: Glide (Pocket HR) app သည် client ၏ ownership ဖြစ်ပြီး ဤ delivery ၏ scope ပြင်ပတွင်ရှိသည်။ Vendor သည် Glide ↔ n8n **integration contract** (field/status handoff) ကိုသာ deliver လုပ်သည် (§ Document 03)။

## 4. Ownership & hosting model (confirmed)

| Component | Hosting / Owner | မှတ်ချက် |
|---|---|---|
| **n8n orchestration** | **Vendor server** (vendor-managed) | Managed-service model — vendor operates & maintains |
| **Supabase database** | **Client account** (`<CLIENT_GMAIL>`) | Handover target — client owns data |
| **OpenRouter (AI API)** | **Client account** | Client funds usage (initial top-up by vendor) |
| **Glide (Pocket HR) app** | **Client account** | Client-owned; out of delivery scope |

ဤ split-ownership model ၏ engineering rationale — client ၏ HR data နှင့် AI spend ကို client ကိုယ်တိုင်ပိုင်ဆိုင်စေပြီး (data sovereignty + cost transparency)၊ orchestration operational burden ကိုမူ vendor ကထမ်းဆောင်သည် (reliability + maintenance)။

## 5. Responsibility (RACI summary)

| Activity | Vendor | Client |
|---|---|---|
| n8n workflow operation & maintenance | **R/A** | I |
| Supabase database hosting & data | S (runbook) | **R/A** |
| AI API funding (OpenRouter) | S (initial top-up) | **R/A** |
| Consultant review of AI drafts (HITL) | I | **R/A** |
| Glide app changes / UI | — | **R/A** |
| Monthly maintenance & monitoring | **R/A** | I |
| Credential custody & rotation | **R/A** | C |

`R` = Responsible · `A` = Accountable · `C` = Consulted · `S` = Supports · `I` = Informed

## 6. Delivery gates (important)

1. **Final payment gate** — Supabase database transfer နှင့် production handover ကို final payment (final pay) လက်ခံရရှိပြီးမှ execute မည် (§ Document 06 §4)။ လက်ရှိ transfer **မဆောင်ရွက်ရသေးပါ**။
2. **Privacy posture gate** — Real HR PII ကို production တွင်စတင်အသုံးမပြုမီ data-privacy posture ကို client acknowledge လုပ်ရမည် (§ Document 05 §5)။
3. **Owner activation gate** — Production publish/activation တိုင်းသည် owner approval လိုအပ်သည်။

## 7. Acceptance path

Client acceptance ကို § Document 07 (UAT / Acceptance Checklist) အတိုင်း ဆောင်ရွက်သည် —

```
Package review  →  UAT walkthrough  →  Final payment  →  Supabase migration
              →  Production activation (owner-gated)  →  Sign-off  →  Maintenance period start
```

## 8. Next actions

| # | Action | Owner | Trigger |
|---|--------|-------|---------|
| 1 | ဤ delivery package review | Client | Now |
| 2 | UAT walkthrough (§ Doc 07) | Vendor + Client | On request |
| 3 | Final payment | Client | After UAT |
| 4 | Supabase migration (§ Doc 02) | Vendor | After final payment |
| 5 | Production activation | Vendor (owner-gated) | After migration verify |
| 6 | Maintenance period start | Both | On sign-off |
