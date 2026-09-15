# TASK-001 — Discovery Routing Test Cases (Evidence Draft)

## Source
`Pocket HR Partner` Glide app ၏ data export (`Tickets`, `>Messages`, `Ticket_Categories_Assignment`, `Options` sheets) ကို analyze လုပ်ပြီး ထုတ်ယူထားသော representative test case များဖြစ်သည်။ Contact detail များကို ဖယ်ရှားထားပြီး `request_id` / `company_id` / `user_id` တို့ကို placeholder ဖြင့်အစားထိုးထားသည်။

**Provenance caveat (အရေးကြီးသည်)** — Pocket HR သည် **development stage** တွင်ရှိပြီး live customer မရှိသေးပါ။ Export ထဲက ticket, chat message နှင့် payment/invoice record များသည် **team ကိုယ်တိုင်ရိုက်ထည့်ထားသော demo/test data** ဖြစ်သည်။ ထို့ကြောင့် —
- ဤ test case များကို **user demand evidence သို့မဟုတ် usage statistic အဖြစ် မကိုးကားရ**။ Category အလိုက် ticket အရေအတွက်သည် market signal မဟုတ်ပါ။
- ၎င်းတို့၏ တန်ဖိုးမှာ **HR domain expert များရေးသားထားသော realistic phrasing sample** အဖြစ်သာဖြစ်သည် — routing behavior ကို စမ်းသပ်ရန် လုံလောက်သော်လည်း agent answer quality ကို benchmark လုပ်ရန် မလုံလောက်ပါ။
- Production traffic ရလာသည့်အခါ eval set ကို real request များဖြင့် အစားထိုး/တိုးချဲ့ရမည်။

ဤဖိုင်သည် **SPEC-001 §Verification** ("HR, SOP, Org Chart, unknown, missing-field case များအတွက် test evidence") အတွက် draft evidence ဖြစ်ပြီး၊ TASK-001 acceptance criteria "At least five representative test cases are recorded and pass" ကို ကိုးကားရန်အသုံးပြုနိုင်သည်။ Actual implementation ရေးသားပြီးမှ pass/fail ကို confirm ရမည်။

## Finding — Category Taxonomy vs SPEC-001 Intents

App ၏ `Options` / `Ticket_Categories_Assignment` sheet များအရ configured ticket category ၉ ခုရှိသည်: `Job Description`, `Recruitment`, `KPI / Performance`, `HR Policies / Procedures`, `Employee Conflict / Discipline`, `Workplace Communication`, `HR Forms / Documents`, `SOP / Process`, `Organization Chart / Structure`.

ဤ taxonomy သည် ticket **content** မဟုတ်ဘဲ app **configuration** မှလာသောကြောင့် အထက်ပါ demo-data caveat နှင့်မသက်ဆိုင်ပါ — ၎င်းသည် product team ကိုယ်တိုင် ဒီဇိုင်းလုပ်ထားသော intentional taxonomy ဖြစ်သည်။

Mapping result:
- `SOP / Process` → `sop_generation`
- `Organization Chart / Structure` → `org_chart_generation`
- ကျန် ၇ category (`Job Description`, `Recruitment`, `KPI / Performance`, `HR Policies / Procedures`, `Employee Conflict / Discipline`, `Workplace Communication`, `HR Forms / Documents`) → **အားလုံး `hr_consultation` အောက်ကျရောက်သည်**

**Conclusion**: SPEC-001 ၏ ၃-intent model (`hr_consultation` / `sop_generation` / `org_chart_generation` / `unknown`) သည် configured category taxonomy ကို gap မရှိဘဲ cover လုပ်နိုင်သည် — Discovery Agent မှာ intent အသစ်ထပ်ဖြည့်စရာမလိုပါ။ Sub-category (Recruitment, KPI/Performance, စသည်) များကို Handoff Contract ၏ ရှိနှင့်ပြီးသား `category` field (`SPEC-001` line 15/50) ထဲသို့ pass-through metadata အဖြစ်ထားသင့်ပြီး၊ Discovery Agent ၏ intent classification logic ထဲ hardcode မထည့်သင့်ပါ။ ဤ finding ကို SPEC-001 ပြင်ရန်မလိုပါ — confirmatory evidence သာဖြစ်သည်။

## Test Cases

| # | Intent (expected) | `category` (passthrough) | Question (redacted, export-derived) | Notes |
|---|---|---|---|---|
| 1 | `hr_consultation` | `Recruitment` | "Can't find a suitable candidate for the Finance Manager position and candidate quality is very poor. I want suggestions and an interview checklist for this." | Demo ticket content (English), clean single-intent case |
| 2 | `hr_consultation` | `Employee Conflict / Discipline` | "An employee is not happy with their recent increment and submitted a resignation. They still have a contract with us for another 6 months." | Demo ticket content; conflict/discipline sub-case |
| 3 | `hr_consultation` | `Workplace Communication` | "ကျွန်ုပ်တို့ Company တွင် Sales Team မှ Employee Turnover Rate မြင့်မားနေပြီး ၆ လအတွင်း ဝန်ထမ်း ၈ ဦး အလုပ်ထွက်ခဲ့ပါသည်။ Exit Interview အရ Salary၊ Supervisor Management နှင့် Career Growth အပိုင်းများတွင် ပြဿနာရှိကြောင်းတွေ့ရပါသည်။" | Demo ticket content (Burmese); multi-topic, still single `hr_consultation` intent |
| 4 | `sop_generation` | `SOP / Process` | "I want an SOP for our company's probation process." | Demo ticket content, explicit SOP request |
| 5 | `sop_generation` | `SOP / Process` | "Orientation နဲ့ ပတ်သက်ပြီး SOP တစ်ခုကို လိုချင်ပါတယ်။ Orientation ပေးချိန်တိုင်း struggle လုပ်နေရလို့ပါ။" | Demo ticket content (Burmese) |
| 6 | `org_chart_generation` | `Organization Chart / Structure` | "I need an updated organization chart for our department after the recent restructuring, showing reporting lines down to team-lead level." | ⚠️ **Synthesized** — the export's only `Organization Chart / Structure` ticket contains placeholder text (`"jloijdde"`). No usable example exists yet in the dev data. |
| 7 | `unknown` | `Job Description` (raw label only, no body) | "test" | Demo ticket — too sparse to classify; correct behavior is `unknown` / clarification, not forced routing into `hr_consultation` on category label alone |
| 8 | `unknown` | `KPI / Performance` (raw label only) | "test turnover" | Demo ticket — same sparse-input pattern |
| 9 | `hr_consultation` (needs_clarification candidate) | `SOP / Process` (as labeled) | "ကျွန်ုပ်၏ Company တွင် HR Department မရှိသေးဘဲ Employee ၆၀ ခန့် ရှိပါသည်။ လက်ရှိတွင် HR Policy၊ Job Description၊ Salary Structure နှင့် Performance Management System များ မပြည့်စုံသေးသောကြောင့် HR System တစ်ခုလုံးကို ပြန်လည်တည်ဆောက်လိုပါသည်။" | Demo ticket, human-labeled `SOP / Process` but content spans multi-domain HR setup (policy + JD + comp + performance), not a single SOP artifact request — good edge case to verify Discovery does **not** force a single-document `sop_generation` route on broad requests |
| 10 | validation failure | — | Same as case #1 but with `company_id` omitted from request payload | Synthetic contract-level test (not data-derived) — required for SPEC-001 §Failure Handling: "Required field မရှိပါက agent call မလုပ်ဘဲ validation error ထုတ်ရမည်" |
| 11 | validation failure | — | Same as case #4 but with `user_id` omitted | Synthetic — required-field coverage for a second field |

## Coverage vs Acceptance Criteria

- ✅ Valid HR request → `hr_consultation` (cases 1–3)
- ✅ Valid SOP request → `sop_generation` (cases 4–5)
- ⚠️ Valid Org Chart request → `org_chart_generation` (case 6, synthesized — no usable example in the export; a representative Org Chart request should be authored with the HR team before treating this case as evidenced)
- ✅ Ambiguous/sparse request → `unknown`, not forced routing (cases 7–8)
- ✅ Missing required field → validation failure, no agent call (cases 10–11)
- ✅ `request_id` / `company_id` / `user_id` unchanged through handoff — to be verified against implementation once built (not derivable from static data alone)

## Status
DRAFT — implementation မတည်ဆောက်မီ acceptance-criteria alignment အတွက် reference documentation သာဖြစ်သည်။ Case 6 အတွက် representative Org Chart request ကို HR team နှင့်အတူ ရေးသားရန်လိုအပ်သည်။ Production traffic ရလာသည့်အခါ ဤ eval set တစ်ခုလုံးကို real request များဖြင့် ပြန်လည်တည်ဆောက်သင့်သည်။
