# HITL Enforcement — Glide Implementation Handoff (Finding 1 remediation)

> Recorded 2026-09-20 (Asia/Yangon). ဤဖိုင်သည် **Glide app owner လုပ်ဆောင်ရန် implementation contract** ဖြစ်သည်။ ဤ round တွင် n8n workflow၊ Glide config၊ Supabase၊ credential တစ်ခုမျှ **မပြောင်းထားပါ** (owner decision: "Glide handoff only")။
>
> **Governing spec**: `work/specs/SPEC-002-hr-consultant-hitl-learning.md` §State Machine, §Security
> **Source finding**: `work/reviews/2026-09-20-repo-and-n8n-audit.md` §Finding 1 (🔴 Critical)
> **Prior evidence**: `work/reviews/2026-09-19-panellist-worklog.md` §Glide HITL review inspection

## Objective

Production HR consultation ကို **100% HITL** ဖြစ်စေရန် Glide layer တွင် enforce ရန်။ Invariant (SPEC-002 §State Machine):

> **`Pending Review` / `AI Drafting` state ရှိစဉ် client (normal user) သည် AI draft ကို လုံးဝမမြင်ရ။ Client မြင်ရသည့် တစ်ခုတည်းသော field သည် `Final_Answer` ဖြစ်ပြီး၊ consultant approve/edit ပြီးမှသာ populate ဖြစ်သည်။**

n8n က AI draft ကို `Final_Answer` သို့ ဘယ်တော့မှ မရေးပါ။ ထို့ကြောင့် delivery-path leak ၏ အဓိကအကြောင်းရင်းသည် **Glide-side gaps** သုံးချက်ဖြစ်သည် (worklog 09-19 inspection မှ verified):

1. Button Block + Consultant editing field များတွင် **Visibility Condition မရှိ** → normal user က review controls ကိုမြင်နိုင်။
2. Approve action သည် **`Ticket_Status` ကို မပြောင်း** → ticket သည် `Submitted` state တွင်ကျန်၊ review buttons ဆက်ပေါ်၊ client view gate မရှိ။
3. Normal-user view သည် unapproved draft field ကို gate မလုပ် → draft leak ဖြစ်နိုင်။

---

## Canonical field & status contract (owner-confirmed 2026-09-20)

| Field | Writer | Visibility | မှတ်ချက် |
|---|---|---|---|
| `Sheet_AI_Answer` | n8n | **Admin/Consultant only** | Canonical AI **draft** field. Client မမြင်ရ။ |
| `Consultant_Answer` | Consultant (Glide) | **Admin/Consultant only** | Edit path မှသာ။ |
| `Final_Answer` | **Glide action only** (Approve/Edit) | Client-visible | Client မြင်ရသည့် တစ်ခုတည်းသော answer field။ |
| `Ticket_Status` | Glide action + n8n | driven | State machine key (အောက်တွင်ကြည့်)။ |

Status values: `Submitted` → `Pending_Review` → `Resolved`.

---

## ✅ Prerequisite dependency — n8n write-back field reconciliation (RESOLVED 2026-09-20, Option A)

**Status: DONE** — owner-approved (Option A)。 Poller `Process pending Glide Panellist requests` (`I01u0vd30Db7xSfx`) ကို reconcile လုပ်ပြီး live publish လုပ်ပြီး (active version `0adfde70-6046-48c0-a2dd-ffd6f3ae05d0`)。 အသေးစိတ်: `learnings/FIXES.md` §F-001。

Applied changes —
- `Prepare Unified Bridge Write` output key `AI_Answer` → **`Sheet_AI_Answer`** (canonical consultant-only draft field)。
- `Keep Pending Requests` pending-dedup guard ကို `Sheet_AI_Answer` empty သို့ align (infinite re-draft loop ကာကွယ်ရန်)。
- `Select One Pending Row` ၏ `AI_Answer` suppression ကို ထားခဲ့ (historical backlog re-draft storm ကာကွယ်)。
- `Final_Answer` ကို မထိ။

ထို့ကြောင့် ယခု n8n က AI draft ကို **`Sheet_AI_Answer`** သို့ရေးသည်။ Glide Approve action ကို `Final_Answer ← Sheet_AI_Answer` အဖြစ်တပ်ဆင်လျှင် canonical field ကို တိုက်ရိုက်ဖတ်နိုင်ပြီ (empty-copy risk ဖြေရှင်းပြီး)。

**Verification gate (Glide implement ပြီးမှ)**: reviewed ticket တစ်ခု၏ `Sheet_AI_Answer` တွင် n8n answer တကယ်ရှိကြောင်း၊ Approve ပြီးနောက် `Final_Answer` = ထို draft (**empty မဟုတ်ဘဲ**) verify ရမည်။

---

## State machine (Glide အနေဖြင့် enforce ရမည်)

```
  [ Submitted ]                     ← Glide row create (user submits ticket)
        │  n8n poller (5-min) writes AI draft → Sheet_AI_Answer
        │  n8n SHOULD also set Ticket_Status = Pending_Review   (see §n8n-side note)
        ▼
  [ Pending_Review ]                ← Consultant သာမြင်ရ။ client မမြင်ရ။
        │
        ├── Approve ─► [ Resolved ]  Final_Answer ← Sheet_AI_Answer
        │                            Ticket_Status ← Resolved
        │
        └── Edit → Done ─► [ Resolved ]  Final_Answer ← Consultant_Answer
                                         Ticket_Status ← Resolved
```

**Invariant**: `Final_Answer` သည် `Resolved` state တွင်သာ populate ဖြစ်ရမည်။ `Submitted` / `Pending_Review` state တွင် client သည် answer မမြင်ရ။

---

## Glide implementation checklist

### 1. Role model
- User table (သို့) Roles column တွင် `role` field သတ်မှတ်ရန် — `admin` / `consultant` / `user`.
- Glide **Row Owners** သို့ **Role** (User Profiles + Roles feature) ကိုသုံး၍ RLS-style access ချမှတ်ရန်။ Visibility condition တစ်ခုတည်းက data security မပေးပါ — sensitive field များအတွက် **Column-level / Row-owner security** ကိုသုံးရန် (client device သို့ data မ sync စေရန်)။

### 2. Consultant-only fields (Admin/Consultant မှသာမြင်ရ)
`Sheet_AI_Answer`, `Consultant_Answer`, review metadata (`Reviewed_By`, `Reviewed_At`, `Unified_Status`, `Unified_Reason_Code`, `Clarification_Question`) —
- Component visibility condition: `role is admin OR role is consultant`.
- **ပို၍လုံခြုံရန်**: `Sheet_AI_Answer` / `Consultant_Answer` ကို Glide **Row Owner column** သို့ **Role-restricted column** အဖြစ်သတ်မှတ်၍ normal-user device သို့ လုံးဝမ sync စေရန် (visibility condition သည် UI-hide သာဖြစ်၍ underlying data ကို client device တွင်ရှိနေနိုင်သည်)။

### 3. Review controls (Button Block + editing field)
- Approve / Edit / Done button block: visibility `(role is admin OR role is consultant) AND Ticket_Status is not Resolved`.
- Consultant editing field (`Consultant_Answer` input): same visibility.
- Normal user အတွက် ဤ controls **လုံးဝ hidden**။

### 4. Approve action
- Set `Final_Answer` ← `Sheet_AI_Answer` (prerequisite §reconciliation ပြီးမှ)。
- Set `Ticket_Status` ← `Resolved`.
- Set `Reviewed_By` ← current user, `Reviewed_At` ← now.
- (Optional metric) `Review_Outcome` ← `approved`.

### 5. Edit → Done action
- Consultant က `Consultant_Answer` ကိုဖြည့်ပြီးမှ Done.
- Set `Final_Answer` ← `Consultant_Answer`.
- Set `Ticket_Status` ← `Resolved`.
- Set `Reviewed_By`, `Reviewed_At`.
- `Review_Outcome` ← `corrected` (SPEC-002 §Learning Ingestion — correction ingest trigger; TASK-003 scope)。

### 6. Client-facing (normal user) view
- Answer component visibility: **`Final_Answer` is not empty** (equivalently `Ticket_Status is Resolved`)。
- Answer component က `Final_Answer` ကိုသာ bind လုပ်ရမည် — `Sheet_AI_Answer` / `Consultant_Answer` ကို normal-user screen တွင် **ဘယ်တော့မှ မ bind ရ**။
- `Pending_Review` state တွင် client အတွက် neutral message ပြရန် (e.g. "consultant review ဆဲ")。

---

## Verification checklist (implement ပြီးလျှင် evidence မှတ်ရန်)

- [ ] **Negative test (အဓိက)**: normal user account ဖြင့် login → pending ticket ၏ `Sheet_AI_Answer` / review controls ကို **မမြင်ရ** (UI + underlying data sync နှစ်ခုလုံး)。
- [ ] Submit ပြီးနောက် `Ticket_Status = Pending_Review`၊ `Final_Answer` empty၊ client answer မပေါ်။
- [ ] Approve → `Final_Answer` = draft (non-empty verified)၊ `Ticket_Status = Resolved`၊ client answer ပေါ်။
- [ ] Edit → Done → `Final_Answer` = `Consultant_Answer`၊ `Ticket_Status = Resolved`。
- [ ] `Resolved` ပြီးနောက် review buttons ပျောက်။
- [ ] Prerequisite reconciliation (§n8n write field) verified — Approve သည် empty မ copy။

---

## Residual / follow-up (ဤ handoff scope ပြင်ပ)

1. ~~**n8n write-field reconciliation** (§Prerequisite)~~ — ✅ DONE 2026-09-20 (Option A, version `0adfde70`)。
2. **n8n Ticket_Status write** — poller က `Ticket_Status = Pending_Review` ကို set သင့် (state machine ကို machine-driven စေရန်)။ လက်ရှိ poller မ set — Glide-only gating သည် "Final_Answer is not empty" condition ဖြင့်လည်း လုံလောက်သော်လည်း status-driven gating ပို robust。 သီးခြား n8n round。
3. Field-name drift ကို `SPEC-002` §Data Contracts နှင့် reconcile (canonical: `Sheet_AI_Answer` draft / `Final_Answer` client)。
4. Audit Finding 5 (PII posture) — client-visible gating က leak ကိုပိတ်သော်လည်း Google Sheet bridge ရှိ PII posture ကို သီးခြားဆုံးဖြတ်ရန်။
