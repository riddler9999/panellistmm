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
