# User Request UI ပြင်ဆင်မှု

- တွေ့ရှိချက်: New Request form သည် `state-card` တစ်ခုတည်းသုံးထားပြီး input၊ label၊ textarea နှင့် button များအတွက် layout/style မရှိသဖြင့် browser default inline controls အဖြစ်ပြနေသည်။ သီးသန့် `consult-request-form` grid နှင့် control styles ထည့်ထားသည်။
- Conversation article အားလုံးသည် တူညီသည့် full-width layout သုံးထားသည်။ User view တွင် မူလ request နှင့် user follow-up ကို ညာဘက်၊ consultant response ကို ဘယ်ဘက် ခွဲထားသည်။
- Status display helper သည် Admin/User မခွဲထားသောကြောင့် user ထံ `Waiting for user` နှင့် `Needs approval` ပြနေသည်။ Role အလိုက် display label ပြောင်းထားပြီး upstream status values မပြောင်းထားပါ။
- ကာကွယ်မှု: User status filtering၊ detail badge နှင့် original/follow-up message class များအတွက် regression tests ထည့်ထားသည်။

## စစ်ဆေးပြီးရလဒ်

- Production build နှင့် ESLint အောင်မြင်သည်။ မူလ suite 40 files / 149 tests အောင်မြင်ပြီး regression tests ထည့်ပြီး dashboard suite 7 tests အောင်မြင်သည်။
- Local Chromium တွင် mocked authorized API response ဖြင့် 360၊ 390၊ 768၊ 1280 px အကျယ်များမှာ form field stacking၊ user message ညာဘက် alignment နှင့် page horizontal overflow မရှိခြင်းကို စစ်ဆေးအောင်မြင်သည်။
- Live backend write နှင့် production deployment မလုပ်ရသေးပါ။

## Owner feedback အရ New Request UX ပြန်လည်ပြင်ဆင်မှု

- အစောပိုင်း form CSS တွင် မူရင်း `.consult-new` ကိုပြန်မသုံးဘဲ button color ထပ်သတ်မှတ်ခဲ့သည်။ ယခု Submit button သည် မူရင်း class နှင့် `#6023f2` အရောင်ကို တိုက်ရိုက်ပြန်သုံးသည်။
- Request list နှင့် form ကို ခွဲပြထားပြီး Category ကို `work/reviews/TASK-001-test-cases.md` ရှိ configured category ၉ မျိုးဖြင့် dropdown ပြောင်းထားသည်။ Backend အတိုင်း Category ကို optional ထားသည်။
- `title → Ticket_Title → subject`, `category → Ticket_Category → hr_issue`, `description → Request_Text → description` mapping ကို code ဖြင့်စစ်ပြီး mocked intake integration test ထည့်ထားသည်။ Live n8n execution အောင်မြင်မှုဟု မဆိုလိုပါ။ လက်ရှိ payload တွင် `attachments: []` ဖြစ်သည်။
- Build၊ lint နှင့် သက်ဆိုင်ရာ tests 11 ခု အောင်မြင်သည်။ Chromium အကျယ် 360/390/768/1280 px တွင် primary button အရောင်တူခြင်း၊ label တစ်ကြောင်းတည်းရှိခြင်း၊ form stacking နှင့် overflow မရှိခြင်း စစ်ဆေးအောင်မြင်သည်။

## UI UX Pro Max အရ အရောင်ညီညွတ်မှု ပြန်ပြင်ခြင်း

- CSS တွင် consultation selector တူများနှင့် hard-coded purple/status shades ထပ်နေခြင်းကြောင့် component အလိုက် appearance ကွဲနေသည်။ Consultation CSS ကို shared semantic variables ဖြင့် စုစည်းထားသည်။
- မူရင်း primary `#6023f2` ကို ဆက်သုံးပြီး consultant bubble မှ green fill နှင့် message အတွင်း ထပ်ဆင့် colored background များဖယ်ထားသည်။ Status အရောင်ကို badge များတွင်သာ သုံးသည်။
- Design ဆုံးဖြတ်ချက်နှင့် verification evidence ကို `design-system/pocket-hr/MASTER.md` တွင် မှတ်တမ်းတင်ထားသည်။
