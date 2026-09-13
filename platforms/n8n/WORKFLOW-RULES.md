# n8n Workflow Rules

## Source of Truth
Production workflow behavior ကို repository ထဲက exported workflow source နဲ့ documented deployment state တို့နဲ့ sync ဖြစ်အောင်ထိန်းရမယ်။ Live editor state ကို repo ထက်အမြဲမှန်တယ်လို့ မယူဆရ။

## Rules
- Workflow change မစခင် current live/repo state ကို verify လုပ်ရမယ်။
- Webhook contracts, idempotency, retries, timeout/fallback နဲ့ error paths ကို explicit လုပ်ရမယ်။
- Company/tenant identifiers ရှိရင် flow တစ်လျှောက်မပျောက်စေရ။
- Credentials/secrets ကို exported JSON သို့ docs ထဲမထည့်ရ။
- Production publish/activation က human approval gate ဖြစ်တယ်။
- Change ပြီးရင် happy path တစ်ခုတည်းမဟုတ်ဘဲ failure path ကိုပါ verify လုပ်ရမယ်။
