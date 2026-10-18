# ADR-005 — SOP နှင့် Org Chart အတွက် Excel + PNG ကို Canonical Output အဖြစ်သတ်မှတ်ခြင်း

## Status
Accepted — 2026-10-16 owner approval ဖြင့် `ADR-001` ကို supersede လုပ်သည်။

## Context
Owner သည် Draw.io delivery ကို ခေတ္တရပ်ပြီး User အတွက် ကြည့်ရန်လွယ်သော PNG နှင့် consultant ပြင်ဆင်နိုင်သော Excel ကို အတွဲလိုက်ပေးရန် တောင်းဆိုသည်။ PNG တစ်ခုတည်းတွင် data ကို ပြန်ပြင်၍မရသဖြင့် editable worksheet လိုအပ်သည်။

## Decision
- SOP နှင့် Org Chart ready contract တစ်ခုလျှင် `.xlsx` နှင့် `.png` နှစ်ဖိုင်လုံး မဖြစ်မနေထုတ်မည်။
- `.xlsx` သည် editable data source ဖြစ်ပြီး `.png` သည် တူညီသော contract မှရသော snapshot ဖြစ်သည်။
- File နှစ်ခုထဲမှ တစ်ခုမအောင်မြင်လျှင် artifact pair ကို ready မသတ်မှတ်ရ။
- Consultant review/approval မပြီးမချင်း User projection ထဲ မထည့်ရ။
- Draw.io generation workflow ကို inactive ထားမည်။ သမိုင်းဟောင်း `.drawio` download endpoint ကို ရှိပြီးသား links မပျက်စေရန် read-only compatibility အဖြစ်ထားနိုင်သည်။

## Alternatives considered
- `.drawio` canonical + PNG preview: owner ရွေးချယ်ထားသော Excel workflow နှင့်မကိုက်ပါ။
- PNG-only: editable source မရှိပါ။
- Excel-only: User အတွက် diagram preview မရှိပါ။

## Consequences
- Excel data ပြင်ပြီးနောက် PNG ကို renderer ဖြင့် ပြန်ထုတ်ရမည်။ Excel ပြင်ရုံနှင့် PNG အလိုအလျောက်မပြောင်းပါ။
- Renderer သည် contract graph validation၊ file size limit၊ Myanmar/Latin font rendering နှင့် formula-string neutralization ပြုလုပ်ရမည်။
- Automatic artifact links ကို consultant အတည်ပြုသည့် response ထဲမှသာ User မြင်ရမည်။

## Verification
- `services/document-renderer/test_render.py`
- Live renderer: `Panellist Excel PNG Renderer` (`LgeDMpvKmDho8GQ3`)
- Live routes: `Panellist Unified Orchestrator` နှင့် `Panellist Artifact Architect API`
