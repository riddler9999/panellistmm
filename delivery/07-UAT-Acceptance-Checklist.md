# 07 — UAT / Acceptance Checklist

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

Client acceptance sign-off အတွက် တိကျသော verification checklist ပေးရန်။ ဤ checklist အားလုံး PASS ဖြစ်ပြီးမှ production activation + maintenance period စတင်သည်။

## 2. Acceptance flow

```
Package review → UAT walkthrough → Checklist sign-off → Final payment
   → Supabase migration → Production activation (owner-gated) → Go-live
```

## 3. UAT test cases — HR consultation (HITL)

| # | Test case | Expected | Pass |
|---|---|---|---|
| 1 | HR staff submits a normal HR question (ticket) | Ticket created, `Ticket_Status = Submitted` | ☐ |
| 2 | Wait for poller (≤5 min) | AI draft appears in `Sheet_AI_Answer` (consultant view only) | ☐ |
| 3 | Log in as **normal user** during Pending_Review | AI draft **NOT visible**; `Final_Answer` empty | ☐ |
| 4 | Consultant **Approve** | `Final_Answer` = draft (non-empty), `Ticket_Status = Resolved` | ☐ |
| 5 | Consultant **Edit → Done** on another ticket | `Final_Answer` = edited text, `Resolved` | ☐ |
| 6 | Client views a Resolved ticket | `Final_Answer` visible; consultant fields hidden | ☐ |
| 7 | Ambiguous / high-risk question (termination/payroll) | Clarify-first behavior (not an unsupported assertion) | ☐ |
| 8 | Non-HR / out-of-scope question | Graceful no-match fallback | ☐ |
| 9 | Blank / invalid input | Invalid-input fallback | ☐ |

## 4. UAT test cases — SOP / Org Chart

| # | Test case | Expected | Pass |
|---|---|---|---|
| 10 | Business discovery → SOP request | `.drawio` SOP artifact generated + download link | ☐ |
| 11 | Org Chart request | `.drawio` Org Chart artifact | ☐ |
| 12 | Artifact download via link | Correct `.drawio` file downloads | ☐ |

## 5. Migration acceptance (post-final-payment)

| # | Test case | Expected | Pass |
|---|---|---|---|
| 13 | Client Supabase `hr_kb` row count | = source row count | ☐ |
| 14 | Vector dimension integrity | `vector_dims` mismatch = 0 | ☐ |
| 15 | Live RAG retrieval on client DB | Grounded answer returned, row count > 0 | ☐ |
| 16 | End-to-end consultation on client DB | Full HITL flow PASS | ☐ |

## 6. Security & privacy acceptance

| # | Item | Expected | Pass |
|---|---|---|---|
| 17 | Consultant fields not synced to normal-user device | Row-owner/role-restricted (Glide) | ☐ |
| 18 | Service key not in client-side code | Server-side only | ☐ |
| 19 | PII posture acknowledgment | Client sign-off (§ Document 05 §5) | ☐ |

## 7. Documentation & handover acceptance

| # | Item | Pass |
|---|---|---|
| 20 | Delivery package (Documents 00–09) received & reviewed | ☐ |
| 21 | Service & Maintenance Agreement reviewed (§ Document 06) | ☐ |
| 22 | Support channel + escalation confirmed (§ Document 08) | ☐ |

## 8. Sign-off

ဤ checklist ၏ item အားလုံး (migration items သည် final payment နောက်) PASS ဖြစ်ကြောင်း အတည်ပြုပါသည် —

| Party | Name | Signature | Date |
|---|---|---|---|
| Client (acceptance) | `<CLIENT_NAME>` | __________ | ______ |
| Vendor (delivery) | `<VENDOR_NAME>` | __________ | ______ |

> Sign-off ပြီးမှ § Document 06 ၏ maintenance period စတင်သည်။
