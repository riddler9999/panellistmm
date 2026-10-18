# Conversation နှင့် Ticket lifecycle

Owner ၏ 2026-10-16 တောင်းဆိုချက်အရ `fix/conversation-approval-lifecycle` branch တွင် ပြင်ပြီး 2026-10-17 တွင် production ဖြန့်ထားသည်။

## ပြောင်းလဲမှု

- Submitted aliases ကို Processing တစ်ခုအဖြစ် စုထားသည်။ Needs approval / Waiting for user / Closed အမည်များဖြင့် ရှင်းလင်းစေသည်။
- မူလ User request ကိုအပေါ်ဆုံးထားသည်။ Response ကို Edit/Approve လုပ်နိုင်ပြီး အတည်ပြုပြီးလျှင် အစိမ်းရောင် disabled Approved ပြသည်။
- User follow-up နှင့် approved response history ကို Supabase တွင်သိမ်းပြီး Sheet bridge ကို context အပြည့်နှင့် Submitted state ပြန်ပို့သည်။ Async dispatcher `wBJ0zhWTsPpPtcOm` က live Unified Orchestrator ကိုပြန်ခေါ်သည်။ Retry လုပ်လျှင် history မထပ်၊ နောက် n8n draft ကို မဖျက်ပါ။
- Owner သာ Close လုပ်နိုင်သည်။ ၄၈ နာရီကို နောက်ဆုံး approved response delivery မှ User မပြန်သောအချိန်ဟု ယူဆထားသည်။ Pending AI/review အချိန်မပါပါ။
- Draft fingerprint ဖြင့် stale approval ကို ငြင်းပယ်သည်။ Pending publication ကို snapshot အသစ်မဖန်တီးဘဲ retry လုပ်သည်။

## Verification

- Final full suite: 40 files / 149 tests PASS။ TypeScript/Vite build နှင့် ESLint PASS။
- TypeScript + Vite build, ESLint, diff whitespace checks PASS။
- Chromium 390px mocked API: request အစဉ်၊ edit/approve၊ disabled Approved၊ Edit ပျောက်ခြင်း၊ horizontal overflow မရှိခြင်း၊ browser error မရှိခြင်း PASS။ Live backend E2E မဟုတ်ပါ။
- PGlite isolated PostgreSQL engine: migration syntax၊ insert/upsert၊ anonymous read denial PASS။
- Production Supabase migrations `20261017122238` နှင့် `20261017122255` apply ပြီး RLS၊ service-role-only access၊ private bucket MIME/size limits ကို read-back verified လုပ်ထားသည်။
- Vercel production deployment `dpl_BxGaxPbJENN8yrgGpbj9aLKeadCS` (`efedf90`) READY။ `/consultation` 200၊ anonymous session 401၊ protected consultation/maintenance 403၊ recent error/fatal logs မရှိ။

## Release လိုအပ်ချက်နှင့် ကန့်သတ်ချက်

1. Conversation နှင့် response-file migrations production တွင် apply ပြီးဖြစ်သည်။
2. ရှိပြီးသား Upstash ကို application writes serialize လုပ်ရန်သုံးသည်။ Function timeout 60s၊ lock lease 120s ဖြစ်သည်။ External n8n writes သည် lock ကို မလိုက်နာသဖြင့် stale/duplicate callbacks ကို isolated UAT ဖြင့်စစ်ရမည်။
3. `CRON_SECRET` နှင့် daily maintenance schedule production တွင် configure ပြီးဖြစ်သည်။ Vercel Hobby plan သည် daily cron သာခွင့်ပြုသည်။ Dashboard နှင့် reply API တွင် 48-hour deadline ကိုတိုက်ရိုက်စစ်ပြီး cron မှ durable closure နှင့် failed sync retry ကိုသိမ်းသည်။
4. New request/follow-up သည် fast 202 dispatcher မှ live webhook-only orchestrator ကိုခေါ်သည်။ Dispatcher သည် active ဖြစ်ပြီး app env ကို sensitive value အဖြစ်ထားသည်။ Real PIN/real ticket မသုံးဘဲ production endpoint boundary သာ smoke test လုပ်ထားသည်။ အလွန်ရှည်သော conversation တွင် Sheet cell-size limit ဆက်ရှိသည်။
5. Closure/history authority သည် Supabase conversation record ဖြစ်သည်။ Sheet status သည် processing bridge ဖြစ်ပြီး Glide အဟောင်းတွင် closure overlay မပေါ်ပါ။ Existing delivered tickets များလည်း ၄၈ နာရီစည်းမျဉ်း သက်ရောက်သည်။
6. Production migration၊ cron activation၊ app deploy နှင့် n8n publish ပြီးဖြစ်သည်။ Real HR ticket ကိုဖန်တီးသည့် end-to-end UAT သည် data မပြောင်းရန် ဤ release verification တွင် မလုပ်ထားပါ။

## Rollback

Migration သည် additive ဖြစ်၍ ledger ကိုမဖျက်ပါ။ Release ပြဿနာရှိလျှင် cron ရပ်နိုင်သည်။ Previous app သည် closure/history မဖတ်သောကြောင့် follow-up အသစ်ရှိပြီးနောက် blind rollback မလုပ်ဘဲ consultation writes ကိုရပ်၍ safe-forward fix လုပ်သင့်သည်။ Conversation data နှင့် approval proofs ကိုမဖျက်ရ။
