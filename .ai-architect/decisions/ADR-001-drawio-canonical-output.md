# ADR-001 — SOP နှင့် Org Chart အတွက် `.drawio` ကို Canonical Output အဖြစ်သတ်မှတ်ခြင်း

## Status
Accepted

## Context
Panellist SOP နှင့် Org Chart workflow များသည် editable diagram artifact ထုတ်ပေးရန်လိုအပ်သည်။ PNG သည် preview/display အတွက်အသုံးဝင်နိုင်သော်လည်း editable source မဟုတ်သောကြောင့် canonical artifact အဖြစ်မသင့်တော်။

## Decision
SOP နှင့် Org Chart workflow များ၏ canonical diagram output ကို `.drawio` အဖြစ်သတ်မှတ်သည်။

## Consequences
- Production workflow သည် `.drawio` artifact ကို generate / validate / deliver လုပ်ရမည်။
- PNG generation ကို default canonical path အဖြစ်မထည့်ရ။
- PNG preview ကိုအနာဂတ်တွင်လိုအပ်ပါက `.drawio` source မှ secondary derived artifact အဖြစ်သာထည့်နိုင်သည်။
- Regression checks များတွင် PNG-only path ပြန်ဝင်လာခြင်းကိုစစ်ဆေးသင့်သည်။

## Change Rule
ဤဆုံးဖြတ်ချက်ကို ပြောင်းရန် explicit owner approval နှင့် ADR အသစ်လိုအပ်သည်။
