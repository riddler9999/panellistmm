# Supabase Security

## Invariants
- Service-role key ကို client-side code ထဲမထည့်ရ။
- Secrets ကို repository documentation ထဲမရေးရ။
- Multi-company data ရှိလာရင် company/tenant isolation ကို schema, query နဲ့ RLS level မှာ enforce လုပ်ရမယ်။
- RLS policy မရှိတာကို application logic နဲ့ပဲ cover လုပ်ထားတယ်လို့ မယူဆရ။
- Privileged operations ကို trusted server/workflow boundary မှာထားရမယ်။

Security model အပြောင်းအလဲတိုင်း relevant requirement/ADR နဲ့ test evidence ရှိရမယ်။
