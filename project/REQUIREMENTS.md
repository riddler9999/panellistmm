# Requirements

## Functional Requirements
- Client-facing surface များမှ request လက်ခံပြီး n8n မှတစ်ဆင့် route လုပ်နိုင်ရမည်။
- Discovery, HR Consultant, SOP နှင့် Org Chart workflows ကို support လုပ်ရမည်။
- Request တစ်ခုလုံးတွင် `user_id` scope မပျောက်ရ။
- Long-running agent work အတွက် asynchronous processing ကို support လုပ်ရမည်။
- Request contract တွင် အနည်းဆုံး `request_id`, `user_id`, `question`, `category` တို့ကို လက်ခံနိုင်ရမည်။
- Response တွင် workflow အလိုက် `status`, `ai_answer` သို့မဟုတ် output, `confidence`, `sources`, review flag metadata တို့ကို structured format ဖြင့်ပြန်ပေးနိုင်ရမည်။
- SOP နှင့် Org Chart diagram များ၏ canonical artifact သည် `.drawio` ဖြစ်ရမည်။
- Low-confidence, policy-sensitive သို့မဟုတ် escalation လိုအပ်သည့် case များအတွက် Human-in-the-loop review path ရှိရမည်။
- Knowledge loader / RAG path အတွက် `company_id` / multi-company tenant scoping ကို requirement အဖြစ်မယူတော့ပါ။

## Non-functional Requirements
- Critical structured output များတွင် deterministic validation ရှိရမည်။
- Request, decision, failure, retry, approval တို့ကို audit ပြန်လုပ်နိုင်ရမည်။
- External retry ဖြစ်နိုင်သည့် request များတွင် idempotency ရှိရမည်။
- Timeout နှင့် fallback behavior ကို explicit သတ်မှတ်ထားရမည်။
- `company_id` / multi-company tenant isolation သည် လက်ရှိ project requirement မဟုတ်ပါ။ ယင်းအတွက် schema, RLS, retrieval filtering သို့မဟုတ် architecture ကို မတိုးချဲ့ရ။
- Secrets များကို committed documentation/source ထဲမထည့်ရ။
- Production-impacting change များသည် explicit approval နှင့် verification လိုအပ်သည်။
- Completion claim မပြုမီ test သို့မဟုတ် observable verification evidence ရှိရမည်။

## Pocket HR consultation requirements — owner update 2026-10-13
ဒီ section သည် consultation-specific functional requirements အတွက် အပေါ်က generic wording ထက် ဦးစားပေးရမည်။ Canonical detail: `project/POCKET_HR_CONTEXT_2026-10-13.md`.
- AI assessment result: `ASK_CLARIFICATION` သို့မဟုတ် `PROVIDE_ADVICE`.
- AI question/advice draft နှစ်မျိုးလုံး consultant approve/edit/reject မဖြတ်မီ user မမြင်ရ။
- Approved clarification question ကို user ဖြေနိုင်ရမည်။ Context/history ထိန်းပြီး AI reassessment လုပ်ရမည်။ Multiple rounds support လုပ်ရမည်။
- Final advice သည် consultant approval ရပြီးမှ user ထံ deliver လုပ်ရမည်။ Approval နှင့် delivery status ကို ခွဲမှတ်ရမည်။
- Resolved ticket သည် read-only; နောက်ထပ် request အသစ်တင်ရမည်။
- Consultant က ticket အားလုံးကြည့်ခွင့်ရှိသည်။ Normal user က မိမိ ticket များသာကြည့်ခွင့်ရှိသည်။ Actual security enforcement သီးခြား verify လုပ်ရမည်။
- Round history, stale-approval protection, idempotent reassessment/delivery နှင့် failure recovery ကို acceptance tests ဖြင့်အတည်ပြုရမည်။
- Existing company-specific KB/tenant expansion restriction ကို အလိုအလျောက် မပြောင်းပါ။
