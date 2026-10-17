# User / Consultant URL ခွဲခြားမှု

## အခြေခံ code
PR #13 မူလ HEAD `ea6f22a` ထက် production branch `fix/conversation-approval-lifecycle` (`90c9a4b`) ကပိုသစ်နေသည်။ ရှိပြီးသား upload/conversation implementation မပျောက်စေရန် PR branch ကို ထို descendant commit သို့ fast-forward လုပ်ထားသည်။ ယခု task တွင် n8n workflow၊ database/schema၊ framework၊ UI design မပြောင်းထားပါ။ အရင် branch ၏ history သည် ယခုအသစ်ရေးသောပြင်ဆင်မှုမဟုတ်ပါ။

## ပြင်ဆင်မှု
- `/consultation/user` → My Requests။ API က session email ကိုပဲသုံးပြီး Admin session ဖြစ်လည်း User projection/ownership ဖြင့်ကန့်သတ်သည်။
- `/consultation/admin` → verified Admin အတွက် All Requests၊ Consultant Dashboard၊ Approve/Edit။ User account ဖြင့် API ခေါ်လျှင် 403။
- `/consultation` အဟောင်းကို User URL သို့ redirect လုပ်သည်။ URL ပြောင်းသောအခါ component state အသစ်စသည်။
- ရှိပြီးသား reply/close persistence ကိုသုံးထားပြီး button ကို `End This Request` ဟုထားသည်။ Admin က User URL သုံးလျှင်လည်း ကိုယ်ပိုင် request ကိုသာ reply/close လုပ်နိုင်သည်။
- Upload/approve/reply/edit တို့သည် lock cleanup ပြီးမှ HTTP response တစ်ကြိမ်သာပို့သည်။ Edit စချိန် draft fingerprint ကိုထိန်းထားသည်။

## စမ်းသပ်မှု
- `npm test -- --run`: 42 files၊ 158 tests PASS။
- `npm run build`: PASS (TypeScript + Vite)။
- `npm run lint`: PASS။
- Chromium 390px / 1280px: Admin edit → PDF upload → approve payload၊ User approved answer → follow-up → End This Request၊ admin controls မပေါ်ခြင်း၊ legacy URL redirect PASS။
- Browser test သည် mocked API ဖြစ်ပြီး live Sheets/Supabase/n8n/Glide E2E မဟုတ်။ ပြန်စမ်းနိုင်သော script: `apps/answer-viewer-sandbox/scripts/verify-consultation-sides.mjs`။ ရှိပြီးသား browser verification ကဲ့သို့ Playwright နှင့် localhost:4173 လိုသည်။
- Read-only production log: 2026-10-17 12:55:47 UTC၊ deployment `dpl_BxGaxPbJENN8yrgGpbj9aLKeadCS`၊ `/api/consultation-approve` တွင် `ERR_HTTP_HEADERS_SENT`။ Cleanup failure regression ကို reproduce/fix လုပ်ထားသည်။ Actual uploaded file နှင့် live reproduction မလုပ်ရသေး။

## Glide Web Embed URL — deploy ပြီးမှ အသုံးပြုရန်
- My Requests: `https://panellistmm.vercel.app/consultation/user`
- All Requests: `https://panellistmm.vercel.app/consultation/admin`

လက်ရှိ passcode/session authentication ကိုဆက်သုံးသည်။ URL က role ပေးခြင်းမဟုတ်။ Glide login နှင့် app session သည်တစ်ခုတည်းဟုမယူဆရ။

## မပြီးသေးသောအပိုင်း
Production deployment နှင့် real Glide account/file UAT မလုပ်ရသေး။ `agent/WORKFLOW.md` ၏ production deployment approval gate အရ owner ခွင့်ပြုချက်လိုသည်။ PR branch auto-deploy ပိတ်ထားသော configuration ကိုမပြောင်းထားပါ။ ထို့ကြောင့် အထက် URL များကို live-ready ဟုမဆိုနိုင်သေး။
