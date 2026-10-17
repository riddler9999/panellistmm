# Requester name၊ reviewed files နှင့် clarification choices

## Implemented

- `Pocket HR PINs` ၏ optional `E: Name` column မှ requester အမည်ကို email ဖြင့်ချိတ်ပြသည်။ Column မရှိသေးလျှင် Admin သည် Details → Requester name → Save name မှဖန်တီး/ပြင်နိုင်သည်။ Email/PIN များကို User projection ထဲမထည့်ပါ။ အမည်မရှိလျှင် အမည်မခန့်မှန်းဘဲ User ဟုသာပြသည်။
- Consultant သည် Edit mode တွင် PNG/XLSX/PDF အများဆုံး ၅ ခု၊ တစ်ခုလျှင် 2 MB အထိ upload လုပ်နိုင်သည်။ PNG ကို decode/re-encode လုပ်သည်။ XLSX သည် OOXML structure၊ archive expansion limit နှင့် macro/embedded payload checks ဖြတ်ရသည်။ PDF သည် signature/end marker စစ်ပြီး download-only ပေးသည်။ Malware scan အထောက်အထားမဟုတ်ပါ။
- Private Supabase bucket နှင့် server-only file metadata သုံးသည်။ Immutable approved snapshot ထဲ file IDs/metadata နှင့် choices ကို bind လုပ်သည်။ Owner authorization၊ approval membership၊ delivery proof မရှိလျှင် download မရပါ။ နောက် clarification round တွင် ယခင် approved file history ဆက်ရှိသည်။
- Consultant သည် choices ၈ ခုအထိ ထည့်/ပြင်နိုင်သည်။ User သည် option တစ်ခုရွေး၍ အပိုစာသားထည့်နိုင်သည်၊ သို့မဟုတ် တစ်ခုမှမရွေးဘဲ ကိုယ်တိုင်ရေးဖြေနိုင်သည်။
- n8n clarification JSON contract: `{"kind":"clarification","question":"...","options":["...","..."]}`။ Plain-text question/advice အဟောင်းကိုလည်း လက်ခံသည်။ Question တစ်ခုထက်ပိုပြီး choice တစ်စုတည်းပါလာလျှင် formatter ငြင်းပယ်သည်။

## Live n8n release

`Panellist Unified Orchestrator` (`97Hrjp3aKOLIR4wJ`) active version `87206869-29e2-49d3-946d-0cfbe25b6500` တွင် structured clarification choices၊ consultant review guard နှင့် RAW Sheet write ပါဝင်သည်။ User သည် option ရွေးနိုင်သလို custom answer သီးသန့်ရေးနိုင်သည်။

Changed nodes: `Call HR Consultant Agent`, `Format HR Response`, `Format Dual Response` နှင့် bridge review guards။ Node schema validation PASS၊ synthetic formatter cases ၅ ခု PASS။ Patch ကို `workflows/patches/2026-10-16-clarification-choices.json` တွင်သိမ်းထားသည်။

`Panellist Async Request Dispatcher` (`wBJ0zhWTsPpPtcOm`) active version `897f81cd-b37e-4689-a030-291065d437c3` က new request/follow-up ကို 202 ချက်ချင်းလက်ခံပြီး canonical orchestrator သို့ forward လုပ်သည်။

## Recommended deliverable contract

| အမျိုးအစား | ပေးသင့်သောဖိုင် | Excel အတွင်း editable data |
| --- | --- | --- |
| Org Chart | PNG + XLSX | Employee/position/department/manager mapping |
| SOP Diagram | PNG + XLSX | Step/owner/input/output/decision/next step |
| Form | XLSX; PNG သည် optional preview | ဖြည့်နိုင်သည့် cells၊ field labels၊ validation |

PNG သည် preview ဖြစ်ပြီး editable source မဟုတ်ပါ။ Excel data ပြင်ပြီးလျှင် PNG ကို regenerate လုပ်ရမည်။ PNG နှင့် Excel ကို အတူတူ version ဖြင့် consultant review လုပ်သင့်သည်။ Automatic renderer replacement နှင့် architecture reconciliation ကို 2026-10-17 တွင် `ADR-005` နှင့် `work/reviews/2026-10-17-excel-png-renderer.md` အတိုင်း implement/publish လုပ်ပြီးဖြစ်သည်။

## Verification

- Full suite: 38 test files / 144 tests PASS။ ထို့နောက် attachment/choice history regression တစ်ခုထပ်ထည့်ပြီး reply suite 7/7 PASS။
- TypeScript/Vite build၊ ESLint၊ git diff whitespace checks PASS။
- 390px Chromium mocked backend: အမည်၊ file upload + approval payload၊ approved download link၊ choice မရွေးဘဲ custom answer၊ overflow/browser errors မရှိခြင်း PASS။
- PGlite isolated test: file table/bucket migration၊ anonymous metadata access denial၊ public bucket name collision rejection PASS။ Supabase storage runtime test မဟုတ်ပါ။
- Production migrations၊ private bucket၊ `CRON_SECRET`၊ async dispatcher env နှင့် Vercel deployment ကို 2026-10-17 တွင် apply/configure လုပ်ပြီး read-back verified လုပ်ထားသည်။

## Release requirements

- Conversation/file migrations၊ dashboard နှင့် matching n8n version ကို coordinated production release အဖြစ်ဖြန့်ပြီးဖြစ်သည်။ Names column ကို Admin ပထမဆုံး save လုပ်စဉ်သာထည့်သည်။
- Existing standalone `/answer` viewer နှင့် Glide အဟောင်းအတွက် new file/choice UI မထည့်ထားပါ။ ယခု delivery surface သည် `/consultation` ဖြစ်သည်။
- Follow-up bridge သည် Sheet status တစ်ခုတည်းကိုအားမကိုးဘဲ async dispatcher ကိုခေါ်သည်။ Real HR ticket/PIN မသုံးဘဲ deployment၊ auth boundary နှင့် workflow activation ကို verify လုပ်ထားသည်။
- Live upload/download၊ requester-name editing နှင့် two-round conversation ကို owner test account ဖြင့် UAT လုပ်နိုင်သည်။
- Draft uploads များမှာ orphan ဖြစ်နိုင်ပြီး automatic cleanup မပါသေးပါ။ Approved files ကို immutable အဖြစ်ထားသည်။
- Rollback တွင် old dashboard သည် encoded approval snapshot ကိုမသိသဖြင့် metadata ပါသော response အသစ်ရှိပြီးနောက် blind rollback မလုပ်ရ။ Data မဖျက်ဘဲ safe-forward လုပ်သင့်သည်။
