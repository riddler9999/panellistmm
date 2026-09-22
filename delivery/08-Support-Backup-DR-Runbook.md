# 08 — Support, Backup & Disaster Recovery Runbook

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

Production support escalation, backup strategy နှင့် disaster-recovery procedure ကို သတ်မှတ်ရန်။ System reliability ကို production အဆင့်ထိန်းသိမ်းရန်။

## 2. Support & escalation

| Tier | Issue type | Channel | Response target |
|---|---|---|---|
| **T1** | Question / how-to / minor config | Moe Htet · 09-969222535 | 1 business day |
| **T2** | Non-critical bug (fallback works) | Moe Htet · 09-969222535 | 3–5 business days |
| **T3** | Critical outage (no AI drafts / RAG down) | Moe Htet · 09-969222535 (priority) | acknowledge same / next business day |

**Escalation path** — Client HR/admin → Vendor support (Moe Htet · 09-969222535) → Vendor investigates n8n/Supabase/API → Fix or upstream provider escalation。

> ⚠️ HITL fallback — AI draft generation ရပ်တန့်နေချိန်တွင်ပင် **consultant manual answer** ဖြင့် HR consultation ဆက်လက်ဆောင်ရွက်နိုင်သည် (business continuity)။

## 3. Common incidents & first response

| Symptom | Likely cause | First response |
|---|---|---|
| AI drafts မလာ (Sheet_AI_Answer empty) | Poller stopped / OpenRouter balance ကုန် / RAG down | Poller execution + OpenRouter balance စစ် (§ Document 04) |
| "relation hr_kb does not exist" | Wrong DB credential / migration incomplete | Supabase credential + row count စစ် (§ Document 02) |
| Draft leak (client sees AI draft) | Glide visibility/row-owner not enforced | Glide role-restricted column စစ် (§ Document 03) — client-side |
| Retrieval returns nothing | `hr_kb` empty / embedding dimension mismatch | Row count + `vector_dims = 1536` စစ် |
| Execution `success` but 0 rows written | Silent write failure | ⚠️ status မယုံ; **row count တကယ်စစ်** |

## 4. Backup strategy

| Asset | Backup method | Frequency | Owner |
|---|---|---|---|
| Supabase database | Supabase automated backups (client tier) + periodic `pg_dump` | Daily (platform) / weekly (dump) | Client (+ vendor runbook) |
| n8n workflows | Version-controlled export (JSON) | On change | Vendor |
| Knowledge base (`hr_kb`) | Included in Supabase backup | — | Client |
| Credentials | Secure vault (not in repo) | On rotation | Vendor |

> **Recommendation** — Supabase paid tier ၏ point-in-time recovery (PITR) ကို production knowledge base အတွက် ဖွင့်ထားရန်။ Free tier ၏ backup retention ကန့်သတ်ချက်ကို client သတိပြုရန်။

## 5. Disaster recovery procedures

### DR-1 — Supabase data loss / corruption
1. Supabase backup / PITR မှ restore (client tier)။
2. `hr_kb` row count + `vector_dims` verify (§ Document 02 §6)。
3. n8n RAG retrieval live test。

### DR-2 — n8n instance failure (vendor server)
1. Vendor server / n8n service restart。
2. Version-controlled workflow JSON မှ re-import (လိုအပ်ပါက)。
3. Credentials re-wire (secure vault မှ)。
4. Poller + RAG health verify。

### DR-3 — API provider outage (OpenRouter / embedding)
1. Provider status page စစ်။
2. Consultant manual-answer fallback ကို client အား notify (business continuity)。
3. Provider recover ပြီး poller resume verify。

### DR-4 — Credential compromise
1. Affected key ချက်ချင်း revoke (Supabase / OpenRouter)。
2. New key ဖန်တီး → secure channel မှ n8n re-wire (§ Document 05)。
3. Audit log review。

## 6. Recovery objectives (recommended targets)

| Objective | Target | မှတ်ချက် |
|---|---|---|
| RTO (recovery time) | within 1 business day | Non-critical; HITL manual fallback available |
| RPO (data loss window) | ≤ 24 hours (daily backup) | Supabase backup frequency အလိုက် |

> RTO/RPO target များကို client ၏ business criticality အလိုက် နှစ်ဖက်သဘောတူ၍ ဖြည့်ရန်။
