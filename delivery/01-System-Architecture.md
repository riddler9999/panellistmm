# 01 — System Architecture

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

System ၏ component များ၊ data flow နှင့် human-in-the-loop safety model ကို client နားလည်လွယ်အောင် ဖော်ပြရန်။ Technical helper တစ်ဦးအတွက် system boundary များကိုပါ ရှင်းလင်းစေရန်။

## 2. High-level topology

```
        ┌─────────────────────────────────────────────────────────────┐
        │                      CLIENT-OWNED                            │
        │                                                              │
        │   ┌──────────────┐                    ┌──────────────────┐   │
        │   │  Glide app   │                    │    Supabase      │   │
        │   │ (Pocket HR)  │                    │  (client acct)   │   │
        │   │  HR staff /  │                    │  hr_kb (vector)  │   │
        │   │  consultants │                    │  tickets/state   │   │
        │   └──────┬───────┘                    └────────▲─────────┘   │
        └──────────│──────────────────────────────────── │────────────┘
                   │  (1) ticket submit / poll             │ (3) RAG read
                   │      (4) write-back draft             │     + state write
        ┌──────────▼───────────────────────────────────── │────────────┐
        │                    VENDOR-HOSTED                 │            │
        │                                                  │            │
        │   ┌──────────────────────────────────────────────────────┐   │
        │   │                     n8n                              │   │
        │   │   • Glide poller (5-min)                             │   │
        │   │   • HR Consultant Agent (RAG + deterministic router) │   │
        │   │   • KB Search tool                                   │   │
        │   │   • SOP / Org Chart (.drawio) generation             │   │
        │   └───────────────────────────┬──────────────────────────┘   │
        └───────────────────────────────│──────────────────────────────┘
                                         │ (2) embedding + LLM
                              ┌──────────▼──────────┐
                              │   AI model APIs     │
                              │  OpenRouter (LLM)   │   ← client-funded
                              │  Gemini (embedding) │   → consolidating to OpenRouter
                              └─────────────────────┘
```

## 3. Data flow (HR consultation)

1. **Submit** — HR staff/user သည် Glide (Pocket HR) app တွင် ticket တစ်ခု create လုပ်သည် (`Ticket_Status = Submitted`)။
2. **Poll & draft** — n8n poller သည် ၅ မိနစ်တစ်ကြိမ် pending ticket များကို poll လုပ်၍ HR Consultant Agent သို့ပို့သည်။ Agent သည် Supabase `hr_kb` (RAG) မှ grounded context ကို retrieve လုပ်ပြီး AI **draft** တစ်ခုထုတ်သည်။
3. **Write-back (consultant-only)** — AI draft ကို `Sheet_AI_Answer` field သို့သာရေးသည် — **client မမြင်ရ**။
4. **Human review (HITL)** — Consultant သည် draft ကို Glide တွင် review လုပ်၍ **Approve** သို့ **Edit** လုပ်သည်။ ထိုအခါမှသာ `Final_Answer` populate ဖြစ်ပြီး client မြင်ရသည် (`Ticket_Status = Resolved`)။

## 4. Human-in-the-Loop (HITL) safety model

> **Core invariant** — `Final_Answer` သည် `Resolved` state တွင်သာ populate ဖြစ်ရမည်။ `Submitted` / `Pending_Review` state တွင် client သည် AI answer ကို **လုံးဝမမြင်ရ**။

```
  [ Submitted ]
       │  n8n → Sheet_AI_Answer (draft, consultant-only)
       ▼
  [ Pending_Review ]                consultant သာမြင်ရ
       │
       ├── Approve ─► [ Resolved ]  Final_Answer ← Sheet_AI_Answer
       │
       └── Edit → Done ─► [ Resolved ]  Final_Answer ← Consultant_Answer
```

Field / status contract (canonical) —

| Field | Writer | Client visibility |
|---|---|---|
| `Sheet_AI_Answer` | n8n | ❌ consultant-only |
| `Consultant_Answer` | Consultant | ❌ consultant-only |
| `Final_Answer` | Consultant action | ✅ only when `Resolved` |
| `Ticket_Status` | Glide/consultant | ✅ |

ဤ model ၏ engineering rationale — HR domain သည် policy-sensitive (termination, payroll, legal) ဖြစ်၍ AI hallucination risk ကို human gate ဖြင့် eliminate လုပ်ထားသည်။ AI သည် consultant ၏ productivity tool ဖြစ်ပြီး၊ decision authority မဟုတ်ပါ။

## 5. Retrieval quality controls (tested)

| Control | Value | ရည်ရွယ်ချက် |
|---|---|---|
| Minimum similarity threshold | `0.63` | Low-relevance match များကို reject |
| TicketQA near-top clarification delta | `0.01` | ambiguous match → clarify-first |
| Deterministic router | `CLARIFY` / `KB_ANSWER` / `NO_MATCH` / `RETRIEVAL_ERROR` | non-deterministic LLM routing ကိုရှောင် |
| High-risk handling | termination/payroll/legal → clarify-first | unsupported rule assertion ကာကွယ် |
| Fallbacks | invalid-input / no-match / retrieval-error | graceful degradation |

## 6. Components

| Layer | Technology | Owner |
|---|---|---|
| Front-end | Glide (Pocket HR) | Client |
| Orchestration | n8n | Vendor (hosted) |
| Database / state | Supabase Postgres | Client |
| Retrieval | Supabase `pgvector` (`hr_kb`, `vector(1536)`, cosine) | Client |
| Embedding model | `gemini-embedding-001` @1536 → consolidating to OpenRouter | Client-funded |
| LLM (draft generation) | OpenRouter | Client-funded |
| Diagram output | `.drawio` (SOP / Org Chart) | — |

## 7. Boundaries & invariants

- n8n သည် orchestration layer ဖြစ်သည်။ Durable state အားလုံး Supabase တွင်သိမ်းသည်။
- SOP / Org Chart ၏ **canonical artifact သည် `.drawio`** ဖြစ်သည် (PNG သည် default production path မဟုတ်)။
- Production agent များသည် scope / architecture ကို silent ပြောင်းလဲခွင့်မရှိ။
- Multi-company / tenant isolation သည် လက်ရှိ requirement မဟုတ် — schema/RLS/retrieval ကို ထို့အတွက်မတိုးချဲ့ရ။

## 8. Verified runtime references

| Artifact | Identifier |
|---|---|
| Supabase project | `Panellist` (`apnvkmwcmfpkkifzmdfc`) |
| Knowledge table | `public.hr_kb` (`vector(1536)`, cosine) |
| HR Consultant Agent (n8n) | `oWB6VGMxXPT0uzI7` |
| KB Search tool (n8n) | `I2BXh1yN53KcwV0z` |
| Glide poller (n8n) | `I01u0vd30Db7xSfx` |
| SOP/Org Document Architect (n8n) | `gB6WtsJVibehCAot` |

> Runtime ground truth သည် n8n instance + Supabase ဖြစ်သည်။ ဤ document များသည် index / operating guide ဖြစ်သည်။
