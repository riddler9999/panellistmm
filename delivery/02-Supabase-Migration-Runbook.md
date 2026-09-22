# 02 — Supabase Migration & Ownership Runbook

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22
> **Gate**: ဤ migration ကို **final payment လက်ခံရရှိပြီးမှ** execute မည် (§ Document 06 §4)။ လက်ရှိ transfer **မဆောင်ရွက်ရသေးပါ**။

---

## 1. Objective

Vendor-controlled `Panellist` Supabase project (`apnvkmwcmfpkkifzmdfc`) မှ data + schema + RAG knowledge base အားလုံးကို **client ၏ကိုယ်ပိုင် Supabase account** (`<CLIENT_GMAIL>`) သို့ ownership အပြည့်ဖြင့် transfer လုပ်ရန်။ Transfer ပြီးနောက် client သည် database ကို 100% ပိုင်ဆိုင်သည်။

## 2. Analysis — migration approach

Supabase project တစ်ခုကို account တစ်ခုမှ တစ်ခုသို့ ရွှေ့ရန် နည်းလမ်း ၂ မျိုးရှိသည် —

| Option | ဖော်ပြချက် | Recommendation |
|---|---|---|
| **A. Project transfer** | Supabase organization transfer feature — project ID/URL/key မပြောင်း | ⚠️ Paid-org ↔ personal org constraint ရှိ; downtime နည်း |
| **B. Fresh project + schema/data restore** | Client account တွင် project အသစ်ဆောက်၍ schema + data ကို `pg_dump`/restore | ✅ **Recommended** — clean ownership boundary, project အသစ်၏ credential အသစ် |

**Recommendation: Option B**။ Client account တွင် project အသစ်တစ်ခုကို client ကိုယ်တိုင်ဖန်တီးစေခြင်းဖြင့် ownership boundary ရှင်းသည်၊ credential အသစ်များ client ပိုင်ဆိုင်သည်၊ vendor ၏ organization နှင့် billing ကွဲသွားသည်။

## 3. Prerequisites

- [ ] Final payment လက်ခံပြီး (gate)
- [ ] Client Supabase account (`<CLIENT_GMAIL>`) active
- [ ] Client Supabase organization ready (Free/Pro tier — pgvector support လိုအပ်)
- [ ] Source project (`apnvkmwcmfpkkifzmdfc`) read access (vendor)
- [ ] Maintenance window သဘောတူညီ (RAG read အနည်းငယ် downtime ဖြစ်နိုင်)

## 4. Migration runbook (Option B)

### Step 1 — Client project ဖန်တီးခြင်း
1. Client Supabase account → **New project** (region: `ap-southeast-*` recommend)။
2. Project name: `panellist` (သို့ client ရွေးချယ်သည့်အမည်)။
3. Database password ကို client သာသိမ်းသည် (vendor ကို secure channel မှတစ်ဆင့်ပေးအပ် — § Document 05)။

### Step 2 — Extensions
Client project SQL editor တွင် —
```sql
create extension if not exists vector;
```
> `hr_kb` သည် `vector(1536)` သုံးသဖြင့် `pgvector` extension မဖြစ်မနေလိုသည်။

### Step 3 — Schema migrate
Source project မှ schema (tables, constraints, functions, RLS policies) ကို export/apply —
```bash
# Source (vendor)
pg_dump \
  --schema-only --no-owner --no-privileges \
  -h db.apnvkmwcmfpkkifzmdfc.supabase.co -U postgres -d postgres \
  -f panellist_schema.sql

# Target (client) — review ပြီးမှ apply
psql -h db.<CLIENT_PROJECT_REF>.supabase.co -U postgres -d postgres -f panellist_schema.sql
```
> `hr_kb_source_type_check`, `hr_kb_source_id_matches_type` constraint များ + HITL learning-loop migrations + SOP source-type support အားလုံး schema dump တွင်ပါဝင်စေရမည်။

### Step 4 — Data migrate
```bash
# Source (vendor)
pg_dump \
  --data-only --no-owner --no-privileges \
  -h db.apnvkmwcmfpkkifzmdfc.supabase.co -U postgres -d postgres \
  -f panellist_data.sql

# Target (client)
psql -h db.<CLIENT_PROJECT_REF>.supabase.co -U postgres -d postgres -f panellist_data.sql
```
> `hr_kb` embedding vector များ (`vector(1536)`) ကို data dump တွင်ထည့်ရန်။ Row count ကို source နှင့်တိုက်စစ်ရမည် (§ Step 6)။

### Step 5 — Client credentials ထုတ်ယူခြင်း
Client project → Settings → API / Database မှ —
- Project URL (`SUPABASE_URL`)
- Service role key (`SUPABASE_SERVICE_ROLE_KEY`) — **server-side only**
- Database connection string (pooler host, port `6543` pooler / `5432` direct)

### Step 6 — Verification (mandatory)
```sql
-- Row count parity
select count(*) from public.hr_kb;
-- Vector integrity (dimension check)
select count(*) from public.hr_kb where vector_dims(embedding) <> 1536;   -- expect 0
-- Sample retrieval sanity
select id, source_id, source_type from public.hr_kb limit 5;
```
- [ ] `hr_kb` row count = source row count
- [ ] `vector_dims` mismatch = 0
- [ ] Extensions present (`vector`)
- [ ] Constraints present (`hr_kb_source_type_check`, `hr_kb_source_id_matches_type`)
- [ ] RLS policies present

### Step 7 — n8n re-point (vendor)
n8n ၏ Supabase / Postgres credential များကို client project ၏ connection string သို့ update လုပ်သည် (vendor-managed — § Document 05)။ ⚠️ **Post-cutover verification**: RAG retrieval workflow ကို live test လုပ်ပြီး `hr_kb` row count > 0 ကို execution status မဟုတ်ဘဲ တကယ်စစ်ရမည်။

### Step 8 — Cutover & decommission
- [ ] Client project တွင် end-to-end HR consultation test PASS
- [ ] Vendor source project ကို read-only mark (grace period 14–30 ရက်)
- [ ] Grace period ပြီးမှ source project pause/decommission (client approve)

## 5. Rollback

Cutover verification (Step 6–7) မအောင်မြင်ပါက n8n credential ကို source project သို့ ပြန် point လုပ်၍ rollback လုပ်နိုင်သည် (source project ကို grace period အတွင်း မ decommission ရသေးသဖြင့်)။

## 6. Post-migration ownership

Migration ပြီးနောက် —
- Client သည် Supabase project + data ကို 100% ပိုင်ဆိုင်သည်။
- Vendor သည် operational access (n8n credential) ကိုသာ maintenance အတွက်ဆက်လက်ကိုင်ဆောင်သည် (§ Document 05)။
- Supabase billing သည် client account သို့ရွှေ့သည်။
