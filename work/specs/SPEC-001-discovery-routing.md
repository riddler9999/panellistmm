# SPEC-001 — Discovery Routing Baseline

## ရည်ရွယ်ချက်
Panellist ထဲသို့ဝင်လာသော request ကို normalize လုပ်ပြီး intent ကိုသတ်မှတ်ကာ သက်ဆိုင်ရာ specialized agent သို့ safe handoff လုပ်နိုင်သော Discovery layer ကိုတည်ဆောက်ရန်။

## Input Contract
အနည်းဆုံးအောက်ပါ fields များကိုလက်ခံနိုင်ရမည်။

```json
{
  "request_id": "string",
  "company_id": "string",
  "user_id": "string",
  "question": "string",
  "category": "string | null"
}
```

## Supported Intents
- `hr_consultation`
- `sop_generation`
- `org_chart_generation`
- `unknown`

## Discovery Responsibilities
1. Required fields ကို validate လုပ်ရန်။
2. `company_id` နှင့် `user_id` scope ကို downstream အထိမပျောက်စေရန်။
3. User request ကို routing အတွက်လိုအပ်သလောက်သာ normalize လုပ်ရန်။
4. Intent ကို supported intent တစ်ခုအဖြစ် classify လုပ်ရန်။
5. Ambiguous request ဖြစ်ပါက `unknown` သို့မဟုတ် clarification path သို့ပို့ရန်။
6. Specialized agent အတွက် structured handoff payload ထုတ်ရန်။

## Discovery မလုပ်ရမည့်အရာ
- HR policy answer ကိုကိုယ်တိုင်မရေးရ။
- SOP document ကိုကိုယ်တိုင်မထုတ်ရ။
- Org Chart ကိုကိုယ်တိုင်မဖန်တီးရ။
- Company scope မရှိသော knowledge retrieval မလုပ်ရ။
- Unsupported intent ကို supported intent အဖြစ်ခန့်မှန်း၍မပို့ရ။

## Handoff Contract

```json
{
  "request_id": "string",
  "company_id": "string",
  "user_id": "string",
  "intent": "hr_consultation | sop_generation | org_chart_generation | unknown",
  "normalized_request": "string",
  "original_question": "string",
  "category": "string | null",
  "needs_clarification": false
}
```

## Expected Routing
- `hr_consultation` → HR Consultant Agent
- `sop_generation` → SOP Agent
- `org_chart_generation` → Org Chart Agent
- `unknown` → clarification / review path

## Failure Handling
- Required field မရှိပါက agent call မလုပ်ဘဲ validation error ထုတ်ရမည်။
- Intent confidence မလုံလောက်ပါက forced routing မလုပ်ရ။
- Downstream agent unavailable ဖြစ်ပါက failure state ကို structured format ဖြင့်ပြန်ပေးရမည်။
- Retry ဖြစ်နိုင်သော external request များတွင် `request_id` ကို idempotency reference အဖြစ်အသုံးပြုနိုင်ရန် design လုပ်ရမည်။

## Acceptance Criteria
- Valid HR request သည် HR Consultant route သို့ရောက်သည်။
- Valid SOP request သည် SOP route သို့ရောက်သည်။
- Valid Org Chart request သည် Org Chart route သို့ရောက်သည်။
- Ambiguous request ကို arbitrary specialized agent သို့မပို့ရ။
- Missing `request_id`, `company_id`, `user_id`, သို့မဟုတ် `question` ဖြစ်ပါက validation failure ရသည်။
- Downstream handoff တွင် original `request_id`, `company_id`, `user_id` မပြောင်းရ။
- Discovery output သည် deterministic structured contract ကိုလိုက်နာသည်။

## Verification
Implementation ပြီးပါက အနည်းဆုံး HR, SOP, Org Chart, unknown, missing-field case များအတွက် test evidence ရှိရမည်။
