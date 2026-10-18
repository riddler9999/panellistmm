# Excel + PNG automatic renderer release

## Result

- `Panellist Excel PNG Renderer` (`LgeDMpvKmDho8GQ3`) ကို live publish လုပ်ထားသည်။ SOP နှင့် Org Chart semantic contract v2 ကို strict validate လုပ်ပြီး XLSX + PNG နှစ်ဖိုင်လုံးထုတ်သည်။ တစ်ဖိုင်မအောင်မြင်လျှင် ready မပြန်ပါ။
- `Panellist Unified Orchestrator` (`97Hrjp3aKOLIR4wJ`) active version `87206869-29e2-49d3-946d-0cfbe25b6500` နှင့် `Panellist Artifact Architect API` (`tyGUPkBhNvx3C4wv`) တို့ကို renderer အသစ်ဆီပြောင်းထားသည်။
- `Panellist Drawio Renderer — Agent Tool` (`y05dDLnUrz69g7FM`) နှင့် Org-only scaffold (`3oSfcPn3ZAfMkzXg`) inactive ဖြစ်သည်။ Historical Draw.io download endpoint ကို ရှိပြီးသား artifact links မပျက်စေရန် read-only compatibility အဖြစ်ထားသည်။
- User-side approved message renderer သည် reviewed HTTPS download URL များကို clickable links အဖြစ်ပြသည်။ User projection သည် `AI_Answer` draft ကို မထုတ်ဘဲ immutable approval + delivery proof ရပြီးသည့် content ကိုသာ `Consultant` အဖြစ်ပြသည်။

## Renderer behavior

- Org Chart: editable mapping columns + embedded diagram preview ပါသော XLSX၊ structure PNG။ Single-root၊ missing parent၊ cycle၊ disconnected graph ကိုငြင်းသည်။
- SOP: editable step/role/department/decision/next/branch columns ပါသော XLSX၊ process PNG။ Invalid target၊ unreachable step၊ END မရောက်နိုင်သော path နှင့် invalid decision branches ကိုငြင်းသည်။
- Myanmar/Latin mixed text အတွက် RAQM + Noto Sans Myanmar + DejaVu Sans သုံးသည်။ User strings ကို Excel formulas အဖြစ်မတွက်ဘဲ literal text အဖြစ်သိမ်းသည်။
- Input 500 KB၊ node/step 100၊ generated image 32 megapixels၊ artifact 2 MB limits ပါသည်။

## Verification evidence

- Local renderer: `python3 -m unittest discover -s services/document-renderer -v` → 2/2 PASS။
- User app final release: 40 test files / 149 tests PASS; TypeScript/Vite build PASS; ESLint PASS။
- Live n8n smoke executions: Org `96838`၊ SOP `97976` → `status=ready`, `format=xlsx_png`, file pair နှစ်ခုစလုံးပြန်သည်။
- Browser-style download request: generated `.xlsx` နှင့် `.png` နှစ်ခုစလုံး HTTP 200; `file` validation တွင် Microsoft Excel 2007+ နှင့် valid PNG အဖြစ်အတည်ပြုသည်။ Bot-like request ကို endpoint က 403 ပြန်ခြင်းသည် `ignoreBots` policy ဖြစ်ပြီး browser download အလုပ်လုပ်သည်။
- Live readback 2026-10-17: active Unified/Artifact API တွင် old Draw.io renderer ID reference မရှိ၊ renderer အသစ် ID ကို reference လုပ်ထားသည်; Draw.io generator inactive ဖြစ်သည်။

## User-side release boundary

`/consultation` UI၊ requester name၊ file upload/download၊ choices/custom answer၊ Close/48-hour lifecycle နှင့် approved download-link rendering ကို Vercel production သို့ဖြန့်ပြီး Supabase conversation/file migrations apply လုပ်ထားသည်။ New request/follow-up သည် active async dispatcher မှ canonical n8n orchestrator ကိုခေါ်သည်။
