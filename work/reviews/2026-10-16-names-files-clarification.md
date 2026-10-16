# Requester name၊ reviewed files နှင့် clarification choices

## Implemented

- `Pocket HR PINs` ၏ optional `E: Name` column မှ requester အမည်ကို email ဖြင့်ချိတ်ပြသည်။ Column မရှိသေးလျှင် Admin သည် Details → Requester name → Save name မှဖန်တီး/ပြင်နိုင်သည်။ Email/PIN များကို User projection ထဲမထည့်ပါ။ အမည်မရှိလျှင် အမည်မခန့်မှန်းဘဲ User ဟုသာပြသည်။
- Consultant သည် Edit mode တွင် PNG/XLSX/PDF အများဆုံး ၅ ခု၊ တစ်ခုလျှင် 2 MB အထိ upload လုပ်နိုင်သည်။ PNG ကို decode/re-encode လုပ်သည်။ XLSX သည် OOXML structure၊ archive expansion limit နှင့် macro/embedded payload checks ဖြတ်ရသည်။ PDF သည် signature/end marker စစ်ပြီး download-only ပေးသည်။ Malware scan အထောက်အထားမဟုတ်ပါ။
- Private Supabase bucket နှင့် server-only file metadata သုံးသည်။ Immutable approved snapshot ထဲ file IDs/metadata နှင့် choices ကို bind လုပ်သည်။ Owner authorization၊ approval membership၊ delivery proof မရှိလျှင် download မရပါ။ နောက် clarification round တွင် ယခင် approved file history ဆက်ရှိသည်။
- Consultant သည် choices ၈ ခုအထိ ထည့်/ပြင်နိုင်သည်။ User သည် option တစ်ခုရွေး၍ အပိုစာသားထည့်နိုင်သည်၊ သို့မဟုတ် တစ်ခုမှမရွေးဘဲ ကိုယ်တိုင်ရေးဖြေနိုင်သည်။
- n8n clarification JSON contract: `{"kind":"clarification","question":"...","options":["...","..."]}`။ Plain-text question/advice အဟောင်းကိုလည်း လက်ခံသည်။ Question တစ်ခုထက်ပိုပြီး choice တစ်စုတည်းပါလာလျှင် formatter ငြင်းပယ်သည်။

## Live n8n inspection / draft change

`Panellist Unified Orchestrator` (`97Hrjp3aKOLIR4wJ`) သည် active ဖြစ်ပြီး webhook မှစတင်သည်။ HR formatter အဟောင်းသည် string question array ကိုသာလက်ခံသည်။ Org/SOP rendering တွင် Drawio nodes ဆက်ရှိသည်။

Changed draft nodes: `Call HR Consultant Agent`, `Format HR Response`။ Node schema validation PASS၊ synthetic formatter cases ၅ ခု PASS။ Patch ကို `workflows/patches/2026-10-16-clarification-choices.json` တွင်သိမ်းထားသည်။

Draft version: `978c5001-a67a-4137-8089-d3ee61671395`။ Active version: `1af405cf-b035-442e-80a7-240744e538af` မပြောင်းကြောင်း read-back verified ဖြစ်သည်။ Publish မလုပ်ထားပါ။ Existing retired node warnings ကို ဒီအလုပ်တွင် မပြောင်းထားပါ။

## Recommended deliverable contract

| အမျိုးအစား | ပေးသင့်သောဖိုင် | Excel အတွင်း editable data |
| --- | --- | --- |
| Org Chart | PNG + XLSX | Employee/position/department/manager mapping |
| SOP Diagram | PNG + XLSX | Step/owner/input/output/decision/next step |
| Form | XLSX; PNG သည် optional preview | ဖြည့်နိုင်သည့် cells၊ field labels၊ validation |

PNG သည် preview ဖြစ်ပြီး editable source မဟုတ်ပါ။ Excel data ပြင်ပြီးလျှင် PNG ကို regenerate လုပ်ရမည်။ PNG နှင့် Excel ကို အတူတူ version ဖြင့် consultant review လုပ်သင့်သည်။ ဤအဆင့်တွင် manual attachment ပို့နိုင်သော်လည်း Drawio → Excel/PNG automatic renderer replacement ကို implement/publish မလုပ်ထားပါ။ မူလ architecture ၏ canonical Drawio ဆုံးဖြတ်ချက်ကို owner ၏ format ရွေးချယ်မှုအဖြစ် သီးခြား reconcile လုပ်ရန်လိုသည်။

## Verification

- Full suite: 38 test files / 144 tests PASS။ ထို့နောက် attachment/choice history regression တစ်ခုထပ်ထည့်ပြီး reply suite 7/7 PASS။
- TypeScript/Vite build၊ ESLint၊ git diff whitespace checks PASS။
- 390px Chromium mocked backend: အမည်၊ file upload + approval payload၊ approved download link၊ choice မရွေးဘဲ custom answer၊ overflow/browser errors မရှိခြင်း PASS။
- PGlite isolated test: file table/bucket migration၊ anonymous metadata access denial၊ public bucket name collision rejection PASS။ Supabase storage runtime test မဟုတ်ပါ။
- Read-only production inspection: `pocket_hr_conversations` table မရှိသေး၊ Vercel env တွင် `CRON_SECRET` မရှိသေး။ `storage.objects` policies မရှိကြောင်း verified ဖြစ်သည်။ Production data/schema မပြောင်းထားပါ။

## Release requirements

- Previous conversation migration နှင့် new `20261016010000_pocket_hr_response_files.sql` migration ကို coordinated release တွင် apply လုပ်ရန်လိုသည်။ Names column ကို Admin ပထမဆုံး save လုပ်စဉ်သာထည့်သည်။
- Dashboard အသစ်ဖြန့်ပြီးမှ matching n8n draft ကို publish ရမည်။ အရင် UI သို့ structured JSON ပို့လျှင် JSON စာသားအဖြစ်ပေါ်နိုင်သည်။
- Existing standalone `/answer` viewer နှင့် Glide အဟောင်းအတွက် new file/choice UI မထည့်ထားပါ။ ယခု delivery surface သည် `/consultation` ဖြစ်သည်။
- Follow-up bridge reset နောက် live orchestrator invocation ကို isolated end-to-end ticket ဖြင့် verify လုပ်ရန်လိုသည်။ Webhook-only orchestrator ကို Sheet Submitted ပြောင်းခြင်းတစ်ခုတည်းဖြင့် trigger ဖြစ်သည်ဟု မယူဆရ။
- `CRON_SECRET` နှင့် scheduler၊ live upload/download၊ name editing၊ two-round n8n integration စမ်းသပ်ပြီးမှ production readiness ဆိုနိုင်သည်။
- Draft uploads များမှာ orphan ဖြစ်နိုင်ပြီး automatic cleanup မပါသေးပါ။ Approved files ကို immutable အဖြစ်ထားသည်။
- Rollback တွင် old dashboard သည် encoded approval snapshot ကိုမသိသဖြင့် metadata ပါသော response အသစ်ရှိပြီးနောက် blind rollback မလုပ်ရ။ Data မဖျက်ဘဲ safe-forward လုပ်သင့်သည်။
