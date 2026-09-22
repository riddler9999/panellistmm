# 03 — n8n Workflow Operations Guide

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

Vendor-hosted n8n instance ပေါ်ရှိ Panellist workflow များ၊ ၎င်းတို့၏ input/output contract၊ HITL flow နှင့် monitoring approach ကို ဖော်ပြရန်။ n8n operation သည် vendor ၏ maintenance responsibility ဖြစ်သည် (§ Document 06)။

## 2. Workflow inventory (production-relevant)

### Part 1 — HR Consultant / RAG

| Workflow | ID | Active | Role |
|---|---|---|---|
| `HR Consultant Agent` | `oWB6VGMxXPT0uzI7` | ✅ | RAG-grounded draft generation + deterministic router |
| `Panellist HR KB Search — Agent Tool` | `I2BXh1yN53KcwV0z` | ✅ | Retrieval sub-workflow (`hr_kb` cosine search) |
| `Process pending Glide Panellist requests` | `I01u0vd30Db7xSfx` | ✅ | Glide poller (5-min) → draft → `Sheet_AI_Answer` write-back |
| `KB Upsert/Delete` | `xYcyj8ziIj78p8lT` | ⚙️ | Glide KB_Articles write path (webhook, header auth) |

### Part 3 — SOP / Org Chart

| Workflow | ID | Active | Role |
|---|---|---|---|
| `Panellist Document Architect v3` | `gB6WtsJVibehCAot` | ✅ | Discovery → SOP/Org `.drawio` + HR Form `.xlsx` |
| `Panellist Drawio Renderer — Agent Tool` | `y05dDLnUrz69g7FM` | ✅ | Contract validation → Draw.io XML → artifact storage |
| `Panellist Drawio Artifact Download` | `fl1FjM3XlBi7RMQW` | ✅ | Opaque-key download endpoint |

> Runtime ground truth သည် n8n instance ဖြစ်သည်။ ဤ table သည် operating index ဖြစ်သည်။ Workflow behavior အပြောင်းအလဲတိုင်း vendor က version-controlled ပုံစံဖြင့်ဆောင်ရွက်သည်။

## 3. Glide ↔ n8n integration contract

> Glide app သည် client-owned (scope ပြင်ပ) ဖြစ်သော်လည်း၊ vendor သည် n8n ဘက်ရှိ integration contract ကို deliver လုပ်သည်။ ဤ contract ကို Glide side တွင် enforce လုပ်ရန်မှာ client ၏ Glide responsibility ဖြစ်သည်။

### 3.1 Field / status contract

| Field | Writer | Client visibility | မှတ်ချက် |
|---|---|---|---|
| `Sheet_AI_Answer` | **n8n** | ❌ consultant-only | Canonical AI draft field |
| `Consultant_Answer` | Consultant | ❌ consultant-only | Edit path |
| `Final_Answer` | Consultant action | ✅ `Resolved` state တွင်သာ | Client-visible answer |
| `Ticket_Status` | Glide/consultant | ✅ | `Submitted → Pending_Review → Resolved` |
| `Reviewed_By` / `Reviewed_At` | Consultant | ❌ | Audit metadata |
| `Clarification_Question` | n8n/consultant | conditional | CLARIFY route |

### 3.2 n8n behavior (delivered)

- Poller သည် ၅ မိနစ်တစ်ကြိမ် `Ticket_Status = Submitted` (pending) row များကို poll လုပ်သည်။
- AI draft ကို **`Sheet_AI_Answer`** သို့သာ write-back လုပ်သည် — `Final_Answer` ကို **ဘယ်တော့မှ မထိ**။
- Pending-dedup guard သည် `Sheet_AI_Answer` empty state ဖြင့် align ဖြစ်သည် (infinite re-draft loop ကာကွယ်)။

### 3.3 Glide-side enforcement (client responsibility)

Client Glide app တွင် အောက်ပါတို့ enforce လုပ်ရမည် (100% HITL အတွက်) —
1. `Sheet_AI_Answer` / `Consultant_Answer` ကို **Row-owner / role-restricted column** ဖြင့် normal-user device သို့ **မ sync** စေရန် (visibility condition တစ်ခုတည်းမလုံလောက်)။
2. Review controls (Approve/Edit button, consultant input) ကို `role in (admin, consultant) AND Ticket_Status ≠ Resolved` ဖြင့်သာ visible။
3. Approve action: `Final_Answer ← Sheet_AI_Answer`, `Ticket_Status ← Resolved`။
4. Edit→Done action: `Final_Answer ← Consultant_Answer`, `Ticket_Status ← Resolved`။

## 4. HR consultation runtime path (tested)

```
Input Validation → Session Isolation → Retrieval → Retrieval Quality Gate
  → Clarify Extraction → Deterministic Router → Answer Generation → Channel Response
```

Deterministic routes — `CLARIFY` / `KB_ANSWER` / `NO_MATCH` / `RETRIEVAL_ERROR`。

Tested manual RAG matrix (recorded PASS) — generic HR grounding, TicketQA clarification, same-session follow-up, SOP provenance, non-HR no-match, blank input, high-risk termination/final-salary clarify-first。

## 5. Monitoring (vendor-operated)

| Signal | ဘာကိုစစ်သည် | Frequency |
|---|---|---|
| Poller execution health | `I01u0vd30Db7xSfx` success + write-back verify | Daily |
| RAG retrieval health | `hr_kb` row count > 0, retrieval latency | Daily |
| API balance | OpenRouter balance (§ Document 04) | Weekly / on-alert |
| Failed executions | n8n execution error log | On-alert |

> ⚠️ **Operational lesson (delivered as safeguard)** — ingestion/write workflow များ၏ execution status `success` သည် database write အောင်မြင်မှုကို အာမမခံ။ Write path များတွင် **row count ကို တကယ်စစ်ရမည်** (silent-failure prevention)။

## 6. Change management

- Workflow အပြောင်းအလဲတိုင်း vendor က version-controlled ပုံစံဖြင့်ဆောင်ရွက်သည်။
- Production publish/activation တိုင်း owner approval လိုအပ်သည်။
- Destructive / scope-changing operation များကို explicit approval မရှိဘဲ မဆောင်ရွက်ရ။
