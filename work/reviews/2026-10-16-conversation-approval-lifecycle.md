# Conversation နှင့် Ticket lifecycle

Owner ၏ 2026-10-16 တောင်းဆိုချက်အရ `ea6f22a` မှ `fix/conversation-approval-lifecycle` branch တွင် ပြင်ထားသည်။

## ပြောင်းလဲမှု

- Submitted aliases ကို Processing တစ်ခုအဖြစ် စုထားသည်။ Needs approval / Waiting for user / Closed အမည်များဖြင့် ရှင်းလင်းစေသည်။
- မူလ User request ကိုအပေါ်ဆုံးထားသည်။ Response ကို Edit/Approve လုပ်နိုင်ပြီး အတည်ပြုပြီးလျှင် အစိမ်းရောင် disabled Approved ပြသည်။
- User follow-up နှင့် approved response history ကို Supabase တွင်သိမ်းပြီး Sheet bridge ကို context အပြည့်နှင့် Submitted state ပြန်ပို့သည်။ Retry လုပ်လျှင် history မထပ်၊ နောက် n8n draft ကို မဖျက်ပါ။
- Owner သာ Close လုပ်နိုင်သည်။ ၄၈ နာရီကို နောက်ဆုံး approved response delivery မှ User မပြန်သောအချိန်ဟု ယူဆထားသည်။ Pending AI/review အချိန်မပါပါ။
- Draft fingerprint ဖြင့် stale approval ကို ငြင်းပယ်သည်။ Pending publication ကို snapshot အသစ်မဖန်တီးဘဲ retry လုပ်သည်။

## Verification

- Full suite: 35 files / 126 tests PASS။ နောက်ထပ် approval regression ၃ ခု ထပ်ဖြည့်ပြီး focused approval suite 7/7 PASS။
- TypeScript + Vite build, ESLint, diff whitespace checks PASS။
- Chromium 390px mocked API: request အစဉ်၊ edit/approve၊ disabled Approved၊ Edit ပျောက်ခြင်း၊ horizontal overflow မရှိခြင်း၊ browser error မရှိခြင်း PASS။ Live backend E2E မဟုတ်ပါ။
- PGlite isolated PostgreSQL engine: migration syntax၊ insert/upsert၊ anonymous read denial PASS။ Production DB မပြောင်းထားပါ။

## Release လိုအပ်ချက်နှင့် ကန့်သတ်ချက်

1. `20261016000000_pocket_hr_conversations.sql` ကို apply လုပ်ရမည်။ မရှိလျှင် conversation API fail closed ဖြစ်သည်။
2. ရှိပြီးသား Upstash ကို application writes serialize လုပ်ရန်သုံးသည်။ Function timeout 60s၊ lock lease 120s ဖြစ်သည်။ External n8n writes သည် lock ကို မလိုက်နာသဖြင့် stale/duplicate callbacks ကို isolated UAT ဖြင့်စစ်ရမည်။
3. `CRON_SECRET` နှင့် ၅ မိနစ်တစ်ကြိမ် maintenance schedule ကို configure လုပ်ရမည်။ Vercel plan ၏ schedule support ကိုစစ်ရမည်။ Paid service မဖွင့်ထားပါ။ Dashboard နှင့် reply API တွင် deadline ကိုတိုက်ရိုက်စစ်ပြီး cron မှ durable closure သိမ်းသည်။
4. Live n8n သည် existing request ID ၏ Submitted context အသစ်ကို ပြန် process လုပ်နိုင်ကြောင်း verify ရမည်။ Live workflow မပြောင်းထားပါ။ အလွန်ရှည်သော conversation တွင် Sheet cell-size limit ဆက်ရှိသည်။
5. Closure/history authority သည် Supabase conversation record ဖြစ်သည်။ Sheet status သည် processing bridge ဖြစ်ပြီး Glide အဟောင်းတွင် closure overlay မပေါ်ပါ။ Existing delivered tickets များလည်း ၄၈ နာရီစည်းမျဉ်း သက်ရောက်သည်။
6. Production migration၊ cron activation၊ deploy နှင့် live n8n E2E မလုပ်ထားပါ။

## Rollback

Migration သည် additive ဖြစ်၍ ledger ကိုမဖျက်ပါ။ Release ပြဿနာရှိလျှင် cron ရပ်နိုင်သည်။ Previous app သည် closure/history မဖတ်သောကြောင့် follow-up အသစ်ရှိပြီးနောက် blind rollback မလုပ်ဘဲ consultation writes ကိုရပ်၍ safe-forward fix လုပ်သင့်သည်။ Conversation data နှင့် approval proofs ကိုမဖျက်ရ။
