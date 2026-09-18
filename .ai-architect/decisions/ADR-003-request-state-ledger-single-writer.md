# ADR-003 — Request State Ledger နှင့် Single-Writer Boundary

## Status
Accepted — owner က Phase 0 နှင့် Phase 1 စတင်ရန် အတည်ပြုခဲ့သည်။ Production Glide၊ workflow publish နှင့် production database migration apply သည် သီးခြား approval gate အောက်တွင်ရှိနေဆဲဖြစ်သည်။

## Context
Glide request သည် Google Sheet bridge မှတစ်ဆင့် orchestration သို့ဝင်သည်။ Workflow နှစ်ခုထက်ပိုသော writer ရှိပါက duplicate row၊ repeated polling နှင့် field overwrite ဖြစ်နိုင်သည်။ Google Sheet သည် transport၊ queue နှင့် response store သုံးမျိုးရောနေသောအခါ lifecycle state ကို audit ပြန်လုပ်ရန်ခက်သည်။

## Decision
1. Google Sheet AI draft field ကို polling bridge တစ်ခုတည်းကရေးမည်။ Intake workflow သည် agent response ပြန်ပေးရုံသာလုပ်မည်။
2. Bridge row identifier ကို idempotency key အဖြစ်သုံးမည်။ Answer ရှိပြီးသား identifier ကို polling ပြန်မပို့ရ။
3. Supabase `request_jobs` ကို canonical job/state ledger၊ `request_events` ကို append-only trace အဖြစ်သုံးမည်။
4. Google Sheet သည် Glide compatibility transport အဖြစ်သာထားမည်။ Canonical lifecycle state ownership ကို Sheet၊ Glide နှင့် n8n အများအပြားကမယူရ။
5. State transition ကို allow-list ဖြင့် deterministic database function က enforce မည်။ AI output သည် state သို့မဟုတ် permission ကိုတိုက်ရိုက်မဆုံးဖြတ်ရ။
6. Draft result သည် `PENDING_REVIEW` အထိ end user မမြင်ရ။ Human review ပြီး `APPROVED` ဖြစ်မှ `DELIVERED` သို့ရွှေ့မည်။
7. `anon` နှင့် `authenticated` roles အတွက် ledger tables ကိုမဖွင့်ရ။ Trusted workflow/service boundary မှသာ access ပေးမည်။

## Alternatives considered
- Google Sheet ကို canonical queue/state store အဖြစ်ဆက်သုံးခြင်း — duplicate/concurrency/audit အားနည်းချက်ကြောင့် မရွေး။
- Intake workflow ကို Sheet writer အဖြစ်ထားခြင်း — webhook caller နှင့် bridge write ownership ချိတ်ဆက်သွားသောကြောင့် မရွေး။
- Router workflow ကိုချက်ချင်း publish လုပ်ခြင်း — sandbox verification မပြီးသေး၍ မရွေး။

## Consequences
- Request တစ်ခု၏ state နှင့် event history ကို `request_id` ဖြင့် trace လုပ်နိုင်မည်။
- Existing Glide/Sheet integration ကိုချက်ချင်းမဖျက်ဘဲ migration path ရမည်။
- Live bridge တွင် authoritative `user_id` mapping မပြည့်စုံသေးသောကာလအတွက် nullable transition period လိုအပ်သည်။ Production rollout မတိုင်မီ mapping ပြည့်စုံရမည်။
- Webhook authentication credential၊ sandbox Glide visibility/actions နှင့် production publish သည် ဆက်လက် gate ဖြစ်သည်။

## Verification / enforcement
- Contract schemas: `workflows/contracts/`.
- Database enforcement: `supabase/migrations/20260919010000_request_orchestration_foundation.sql`.
- Pre-production verification တွင် duplicate suppression၊ allowed/forbidden transitions၊ RLS negative tests နှင့် HITL visibility tests ပါရမည်။
