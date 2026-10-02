# 02 — Supabase Migration & Ownership Runbook

> Panellist HR AI System · Client Delivery Package v1.1 · 2026-10-03
> **Gate status**: ✅ Final payment received. Migration / ownership handover is now authorized for execution.

---

## 1. Objective

Vendor-controlled Panellist Supabase project မှ data + schema + RAG knowledge base ကို **client ၏ကိုယ်ပိုင် Supabase account** သို့ ownership အပြည့်ဖြင့် handover လုပ်ရန်။ Transfer ပြီးနောက် client သည် database နှင့် billing ကိုပိုင်ဆိုင်ပြီး vendor သည် managed-service operation အတွက်လိုအပ်သည့် server-side credential ကိုသာ ဆက်သုံးမည်။

## 2. Preferred migration approach

| Option | ဖော်ပြချက် | Recommendation |
|---|---|---|
| **A. Project transfer** | Existing Supabase project ကို client organization သို့ transfer | Transfer eligibility / org constraints ကို confirm နိုင်လျှင် အကောင်းဆုံး |
| **B. Fresh client project + restore** | Client project အသစ်သို့ schema + data restore | Transfer မရလျှင် fallback |

**Execution rule**: Existing project transfer support ရှိ/မရှိကို အရင် confirm လုပ်ပြီး, transfer မဖြစ်နိုင်မှ Option B ကိုသုံးရန်။ Production credential churn နှင့် risk ကို အနည်းဆုံးထားရမည်။

## 3. Prerequisites

- [x] Final payment received
- [ ] Client Supabase account active
- [ ] Client organization/project destination confirmed
- [ ] Maintenance window confirmed
- [ ] Source project backup/export captured before cutover
- [ ] Current `hr_kb` row count and vector integrity recorded

## 4. Pre-cutover verification

အောက်ပါ checks မလုပ်ဘဲ migration မစရ:

```sql
select count(*) from public.hr_kb;
select count(*) from public.hr_kb where vector_dims(embedding) <> 1536;
```

Record:
- source `hr_kb` row count
- vector dimension mismatch count (expect 0)
- required extensions
- required functions/indexes
- current RLS policies

## 5. Option A — Supabase project transfer

If Supabase permits direct project transfer:

1. Client organization/project ownership target confirm.
2. Full backup/export capture.
3. Transfer project to client organization.
4. Client confirms owner/admin access.
5. Billing ownership confirmed.
6. Existing project URL/keys behavior verified.
7. Rotate privileged credentials if required.
8. Re-test n8n database connectivity and RAG.

## 6. Option B — Fresh client project + restore

### Step 1 — Create client project
- Region should remain suitable for current latency / residency requirements.
- Enable `vector` extension.

### Step 2 — Schema restore
Use reviewed schema export preserving:
- `hr_kb`
- indexes / HNSW
- RLS policies
- functions such as retrieval RPCs
- constraints and source-type validation

### Step 3 — Data restore
Restore all required knowledge and feedback data, including vector embeddings.

### Step 4 — Verification
```sql
select count(*) from public.hr_kb;
select count(*) from public.hr_kb where vector_dims(embedding) <> 1536;
select id, source_id, source_type from public.hr_kb limit 5;
```

Mandatory:
- [ ] target row count = source row count
- [ ] vector mismatch = 0
- [ ] vector extension active
- [ ] indexes/functions present
- [ ] RLS/policies present
- [ ] sample retrieval passes

## 7. n8n cutover

After client DB verification:

1. Update n8n Supabase/Postgres credentials to client-owned destination.
2. Run a focused RAG retrieval test.
3. Run an HR consultation ticket through the full HITL flow.
4. Verify draft stays consultant-only.
5. Verify Approve/Edit results in the final client-visible answer.
6. Verify no unexpected field/status drift was introduced by the cutover.

## 8. Rollback

Keep the source project available during a grace period. If cutover verification fails:

1. Restore previous n8n credential.
2. Return traffic to the source project.
3. Diagnose target mismatch.
4. Retry only after row/vector/function parity is established.

Do not decommission the source until client-side end-to-end verification passes.

## 9. Post-migration ownership

After successful handover:
- Client owns Supabase project, data and billing.
- Vendor retains only operational access required for the agreed managed service.
- Client may revoke vendor access at any time by rotating credentials.
- Any future schema expansion outside delivered scope requires a separate change request.
