# 07 — Final Handover / UAT Acceptance Checklist

> Panellist HR AI System · Client Delivery Package v1.1 · 2026-10-03

---

## 1. Objective

Final payment အပြီး project ကို client ထံ operationally close လုပ်ရန် acceptance checklist ဖြစ်သည်။ Checklist သည် current production-delivered HITL flow ကို verify လုပ်ရန်ဖြစ်ပြီး Secure Answer Viewer Phase 2 ကို production acceptance scope ထဲ မထည့်ထားပါ။

## 2. Commercial gate

- [x] Final payment received

## 3. HR consultation / HITL smoke tests

| # | Test | Expected | Pass |
|---|---|---|---|
| 1 | Normal HR question submit | Ticket created / processing starts | ☐ |
| 2 | AI draft generated | Draft consultant/admin side only | ☐ |
| 3 | Normal user before approval | Draft not visible | ☐ |
| 4 | Consultant Approve | Approved final answer becomes client-visible | ☐ |
| 5 | Consultant Edit → Done | Edited answer becomes client-visible | ☐ |
| 6 | Closed/delivered ticket reopen/non-visible case | Draft/final visibility follows current approved contract | ☐ |
| 7 | Invalid / out-of-scope input | Safe fallback | ☐ |

> Use the **actual live field/status names** during UAT. Older documentation may contain `Sheet_AI_Answer` / `Resolved`, while later runtime evidence recorded `AI_Answer` / `Awaiting Review` / `Delivered`. Acceptance must follow the live canonical integration contract, not stale labels.

## 4. SOP / Org Chart artifact checks

| # | Test | Expected | Pass |
|---|---|---|---|
| 8 | SOP request | `.drawio` artifact generated | ☐ |
| 9 | Org Chart request | `.drawio` artifact generated | ☐ |
| 10 | Viewer/editor link | Opens expected artifact | ☐ |
| 11 | Download link | Downloads expected artifact | ☐ |

## 5. Supabase handover checks

| # | Test | Expected | Pass |
|---|---|---|---|
| 12 | Client ownership confirmed | Client controls project/org | ☐ |
| 13 | `hr_kb` row-count parity | target = source | ☐ |
| 14 | Vector integrity | dimension mismatch = 0 | ☐ |
| 15 | Retrieval RPC / RAG sanity | Relevant KB result returned | ☐ |
| 16 | n8n using client-owned DB | Production credential points to client DB | ☐ |
| 17 | End-to-end HR test after cutover | Full HITL flow passes | ☐ |

## 6. Security & privacy

| # | Item | Pass |
|---|---|---|
| 18 | Service-role key remains server-side only | ☐ |
| 19 | Normal users cannot access AI/consultant draft fields | ☐ |
| 20 | Client acknowledges AI-provider/PII data flow | ☐ |
| 21 | Credential rotation / revocation ownership understood | ☐ |

## 7. Documentation / operations

| # | Item | Pass |
|---|---|---|
| 22 | Delivery dossier received | ☐ |
| 23 | Support & escalation path confirmed | ☐ |
| 24 | Maintenance scope / fee confirmed | ☐ |
| 25 | Backup / rollback procedure reviewed | ☐ |
| 26 | Future work boundary understood | ☐ |

## 8. Explicit exclusion from current production acceptance

Secure Answer Viewer Phase 2 (PR #8) is excluded from this final-delivery acceptance until its separate rollout gates are completed:
- canonical n8n/Sheet/Glide contract reconciliation
- real server ticket-source configuration
- isolated Glide Web Embed verification
- consultant/admin UAT
- normal-user UAT
- explicit rollout approval

## 9. Sign-off

| Party | Name | Signature | Date |
|---|---|---|---|
| Client | Panellist Business Services | __________ | ______ |
| Vendor | Moe Htet | __________ | ______ |

Maintenance/support effective date: __________
