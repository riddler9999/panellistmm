# 09 — Future Enhancement & Custom Development Roadmap

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

Delivered system ၏ အခြေခံ (foundation) အပေါ်တွင် အနာဂတ်တွင် တိုးချဲ့နိုင်သည့် enhancement path များကို ဖော်ပြရန်။ ဤ document သည် client ၏ business growth အလိုက် system ကို scale လုပ်နိုင်သည့် option များကို ကြိုတင်စီစဉ်ပေးသည်။

## 2. Current foundation strengths

Delivered system သည် production-grade engineering foundation ပေါ်တွင်တည်ဆောက်ထားသည် —

- ✅ **Safety-first HITL** — AI hallucination risk ကို human gate ဖြင့် eliminate
- ✅ **Deterministic routing** — non-deterministic LLM behavior ကို bounded routes ဖြင့် control
- ✅ **RAG grounding** — approved knowledge base မှသာ answer (fabrication ကာကွယ်)
- ✅ **Auditability & fallbacks** — request/decision/failure audit + graceful degradation
- ✅ **Clean ownership boundary** — data (Supabase) + AI spend (OpenRouter) client-owned

ဤ foundation ကြောင့် အောက်ပါ enhancement များကို **rework မလိုဘဲ incremental** တိုးချဲ့နိုင်သည်။

## 3. Enhancement roadmap

### Tier 1 — Quick wins (low effort, high value)

| Enhancement | Value | Notes |
|---|---|---|
| API consolidation (embedding → OpenRouter) | Billing/monitoring ရိုးရှင်း | § Document 04 planned |
| Cost & usage dashboard | AI spend transparency | OpenRouter usage → monthly report automation |
| Knowledge base expansion | Answer coverage တိုးတက် | SOP/FAQ corpus ingestion (Drive pipeline exists) |
| Retrieval-outage resilience test | Reliability hardening | deliberate outage drill (recommended pre-scale) |

### Tier 2 — Capability expansion

| Enhancement | Value | Notes |
|---|---|---|
| Discovery / intent routing agent | Multi-domain auto-routing (HR/SOP/Org) | SPEC-001 backlog |
| Consultant correction learning loop | Answer quality improves over time | de-identify before ingest (§ Document 05) |
| Analytics & reporting | HR ticket trends, resolution time | Supabase + dashboard |
| Additional channels | Telegram / web / other front-ends | orchestration already channel-agnostic |

### Tier 3 — Custom application development

> **Strategic option** — Glide (Pocket HR) app သည် rapid no-code front-end အနေဖြင့် ကောင်းသော်လည်း၊ business scale တက်လာသည်နှင့်အမျှ no-code platform ၏ ကန့်သတ်ချက်များ (custom UX, complex role/permission, performance at scale, deep integration, offline, branding control) ပေါ်လာနိုင်သည်။

| Limitation encountered (Glide) | Custom solution path |
|---|---|
| Row-owner/visibility security ကို enforce လုပ်ရ ခက်ခဲ | Custom app — server-enforced RBAC (Supabase RLS + auth) |
| Custom UX / branding ကန့်သတ် | Custom web/mobile front-end (full control) |
| Complex workflow / approval chain | Custom app + n8n deep integration |
| Performance / scale ceiling | Purpose-built app on owned infra |
| Deep reporting / analytics | Custom dashboards |

n8n orchestration + Supabase data layer + RAG knowledge base သည် **front-end-agnostic** ဖြစ်သောကြောင့်၊ Glide မှ custom application သို့ ပြောင်းလဲရာတွင် **backend/AI logic ကို ပြန်မဆောက်ရဘဲ** front-end သာ အစားထိုးနိုင်သည် — ဤ architecture decision သည် future custom-app path ကို cost-effective ဖြစ်စေသည်။

## 4. Recommendation

| Priority | Action | When |
|---|---|---|
| Now | Tier 1 (API consolidation, KB expansion) | Post go-live |
| Near-term | Retrieval-outage drill before real PII scale | Before production PII |
| Growth-driven | Tier 2 (discovery routing, learning loop) | As ticket volume grows |
| Scale-driven | Tier 3 (custom app) | When Glide limitations block business needs |

## 5. Engagement model for enhancements

Delivered scope ပြင်ပ enhancement အားလုံးကို written change request + separate quotation ဖြင့်ဆောင်ရွက်သည် (§ Document 06 §9)။ Foundation architecture ကို vendor ရေးဆွဲ/တည်ဆောက်ထားသဖြင့် enhancement များကို efficient ဆောင်ရွက်နိုင်သည်။

> **Contact** — enhancement / custom development discussion အတွက် — Moe Htet · 09-969222535。
