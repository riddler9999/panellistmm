# 00 — Delivery Overview & Handover Summary

> Panellist HR AI System · Client Delivery Package v1.1 · 2026-10-03

---

## 1. Objective

ဤ document သည် Panellist Business Services အတွက် တည်ဆောက်ထားသော **Panellist HR AI System** ကို final handover လုပ်ရာတွင် deliver လုပ်သည့် scope, ownership, acceptance နှင့် post-delivery support boundary ကို executive-level ဖြင့် အကျဉ်းချုပ်ဖော်ပြရန်ဖြစ်သည်။

## 2. What is being delivered

Panellist HR AI System သည် HR consultation များကို AI ဖြင့်အထောက်အကူပြုပြီး၊ **human consultant တစ်ဦး၏ approve/edit မပါဘဲ client ထံ answer တစ်ခုမှ မရောက်စေရ** (100% Human-in-the-Loop) ဟူသော production-safety principle ဖြင့်တည်ဆောက်ထားသည်။

| Capability | ဖော်ပြချက် | Delivery status |
|---|---|---|
| **HR Consultant AI (RAG-grounded)** | approved knowledge base (`hr_kb`) မှ retrieve လုပ်၍ grounded draft answer ထုတ်ပေး | ✅ Delivered |
| **Human-in-the-Loop review** | Consultant approve/edit ပြီးမှသာ client-facing final answer ဖြစ်စေ | ✅ Delivered |
| **SOP & Org Chart generation** | Business discovery မှ `.drawio` SOP / Organization Chart ထုတ်ပေး | ✅ Delivered |
| **Glide integration contract** | Pocket HR ticket submit → n8n processing → consultant review → client final answer | ✅ Delivered integration contract |
| **Auditability & fallbacks** | deterministic routing, no-match/error fallback, session isolation | ✅ Delivered |
| **Secure Answer Viewer Phase 2** | signed viewer token + secure embed path | ⏳ Not part of final production handover; review branch / future rollout only |

## 3. Delivery scope boundary

| In scope | Out of scope / future work |
|---|---|
| n8n workflow orchestration (vendor-hosted) | New Glide UI redesign/features beyond current integration |
| Supabase schema + knowledge base + RAG retrieval | Multi-company / multi-tenant redesign |
| AI draft generation + HITL enforcement | New agents / integrations / analytics unless separately quoted |
| SOP / Org Chart `.drawio` generation | Secure Answer Viewer Phase 2 production rollout until remaining UAT gates pass |
| Client handover documentation + operating runbooks | Autonomous AI response without consultant approval |

## 4. Ownership & hosting model

| Component | Owner / Hosting | Final handover posture |
|---|---|---|
| **n8n orchestration** | Vendor-owned VPS | Vendor hosts, operates, monitors and maintains n8n workflows; no VPS/workflow ownership transfer |
| **Supabase database** | Client account target | Ownership handover now authorized by final payment |
| **OpenRouter / AI API** | Client account | Client funds usage |
| **Glide (Pocket HR)** | Client account | Client-owned |
| **Repository / delivery docs** | Vendor GitHub repository | Client receives compiled delivery dossier / agreed materials |

## 5. Monthly managed service\n\nThe current agreed charge is **100,000 MMK per month inclusive of vendor VPS hosting and maintenance**. This is a managed-service fee, not an infrastructure or workflow ownership transfer. Vendor retains VPS and n8n workflows. Client owns its business data and agreed client-side accounts. AI API usage and Supabase billing are separate as described in the service agreement; confirm any actual billing changes with both parties. Scope expansions require separate agreement.\n\n## 6. Final payment and handover state

**Final payment has been received.** The commercial gate that previously blocked database ownership handover is now cleared.

Remaining handover work is operational, not commercial:

1. Execute/confirm client-owned Supabase migration or transfer.
2. Re-point n8n credentials to the client-owned database.
3. Run migration verification and end-to-end RAG/HITL checks.
4. Complete client acceptance/sign-off.
5. Start the monthly maintenance period under Document 06, if the maintenance service is continuing.

## 6. Production boundary

The final delivered production path remains the existing approved-answer / HITL flow.

The separate Secure Answer Viewer Phase 2 work in PR #8 is **not included as a production-ready delivered feature** at this handover checkpoint. It remains blocked on contract reconciliation, real ticket-source configuration, Glide embed verification and user UAT. This prevents unfinished review work from being represented as completed delivery.

## 7. Acceptance path

```
Final payment received
        ↓
Supabase ownership handover / migration
        ↓
Credential cutover + RAG verification
        ↓
End-to-end HITL/UAT verification
        ↓
Client sign-off
        ↓
Maintenance period / operational support
```

## 8. Handover completion criteria

- [x] Final payment received
- [ ] Client Supabase ownership/migration completed
- [ ] n8n repointed to client database and verified
- [ ] RAG row/vector integrity verified
- [ ] Approve/Edit → Final Answer flow smoke-tested after cutover
- [ ] SOP / Org Chart artifact links smoke-tested
- [ ] Security/privacy acknowledgment completed
- [ ] Client sign-off completed
- [ ] Maintenance effective date recorded
