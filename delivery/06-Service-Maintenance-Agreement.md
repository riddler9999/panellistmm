# 06 — Service & Maintenance Agreement

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22
> ⚠️ ဤ document သည် commercial agreement **template** ဖြစ်သည်။ တရားဝင် လက်မှတ်ရေးထိုးမီ နှစ်ဖက်စလုံး review လုပ်ရန် (လိုအပ်ပါက legal review)။

---

## 1. Parties

| Role | Name |
|---|---|
| Service Provider (Vendor) | `<VENDOR_NAME>` |
| Client | `<CLIENT_NAME>` |
| Effective date | `<EFFECTIVE_DATE>` |

## 2. Objective

Panellist HR AI System ၏ n8n orchestration layer ကို vendor server ပေါ်တွင် host လုပ်ခြင်း၊ operate လုပ်ခြင်း နှင့် maintain လုပ်ခြင်း အတွက် လစဉ် service terms ကို သတ်မှတ်ရန်။

## 3. Monthly service fee

| Item | Amount | Cycle |
|---|---|---|
| **Server hosting + maintenance** | **100,000 MMK** | လစဉ် (monthly) |

**ပါဝင်သည် (included)** —
- n8n instance ကို vendor server ပေါ်တွင် host + uptime maintain
- Workflow monitoring (poller health, RAG retrieval health, execution errors)
- Bug fix / operational fix (delivered scope အတွင်း)
- Credential management + routine rotation (§ Document 05)
- လစဉ် maintenance summary (execution health + approximate AI usage)
- Minor configuration adjustment (delivered workflow များအတွင်း)

**မပါဝင် (excluded)** — § 6

## 4. Payment gates

| Gate | Condition |
|---|---|
| **Final payment (final pay)** | Supabase migration + production handover ကို final payment လက်ခံရရှိပြီးမှ execute မည် (§ Document 02)။ လက်ရှိ transfer မဆောင်ရွက်ရသေး |
| Monthly fee | Service period စတင်ချိန်မှစ၍ လစဉ်ကြိုတင်/သဘောတူသည့်နေ့တွင်ပေးချေ |
| AI API cost | Client account (OpenRouter) မှ တိုက်ရိုက်ကျခံ — monthly fee တွင်မပါ (§ Document 04) |
| Supabase cost | Client account မှ တိုက်ရိုက်ကျခံ — monthly fee တွင်မပါ |

## 5. Service levels (SLA)

| Metric | Target |
|---|---|
| n8n instance uptime | Best-effort `<TARGET, e.g. 99%>` monthly (server infra limitation အလိုက်) |
| Critical bug response | `<e.g. 1 business day>` အတွင်း acknowledge |
| Non-critical fix | `<e.g. 3–5 business days>` |
| Maintenance report | လစဉ် |
| Support channel | `<VENDOR_CONTACT>` |

> SLA target များကို နှစ်ဖက်သဘောတူ၍ ဖြည့်ရန်။ Uptime သည် vendor server infrastructure + upstream provider (Supabase, OpenRouter) ၏ availability အပေါ်မူတည်သည်။

## 6. Exclusions (monthly fee မပါဝင်)

- **Glide app development / UI changes** — client-owned, scope ပြင်ပ (§ Document 00)
- **AI API cost** (OpenRouter / embedding) — client account (§ Document 04)
- **Supabase hosting cost** — client account (§ Document 02)
- **New feature / new workflow development** — separate quotation (§ Document 09)
- **Scope-changing work** (multi-company isolation, new agents, integrations) — separate quotation
- **Data entry / knowledge base content creation** — client responsibility
- **Third-party outage** (Supabase/OpenRouter/Glide platform downtime) — vendor control ပြင်ပ

## 7. Client responsibilities

- HR consultant review (HITL approve/edit) — client staff
- OpenRouter balance top-up (§ Document 04)
- Supabase account + billing (§ Document 02)
- Glide app maintenance (§ Document 00)
- Timely payment of monthly fee
- Credential handling per § Document 05

## 8. Term & termination

| Item | Terms |
|---|---|
| Initial term | `<e.g. month-to-month / 6-month>` |
| Notice period | `<e.g. 30 days>` |
| On termination | Vendor သည် client ကို operational handover (credential, runbook) ပေးအပ်; client က key rotate (§ Document 05) |
| Data ownership on exit | Client ၏ Supabase data + OpenRouter account သည် client ပိုင်ဆက်ဖြစ် |

## 9. Change requests

Delivered scope ပြင်ပ work အားလုံးကို written change request + separate quotation ဖြင့်ဆောင်ရွက်သည် (§ Document 09 — enhancement roadmap)။

---

## Signatures

| Party | Name | Signature | Date |
|---|---|---|---|
| Service Provider | `<VENDOR_NAME>` | __________ | ______ |
| Client | `<CLIENT_NAME>` | __________ | ______ |
