# User Request UI — Production release

Owner က မူရင်း UI အရောင်များအတိုင်းပြန်သုံးပြီး live တင်ရန် အတည်ပြုထားသည်။

- Production commit: `821df1948e5edd042623fb87db45b9036b653fdf`။
- Deployment: `dpl_BDwjjFjH5pDwMyjY92PgkQywkdCr`၊ target `production`၊ `READY`။
- Live URL: https://panellistmm.vercel.app/consultation/user
- `panellistmm.vercel.app` alias က အထက်ပါ deployment သို့ညွှန်ကြောင်း Vercel read-back ဖြင့်စစ်ပြီးဖြစ်သည်။
- PR: https://github.com/riddler9999/panellistmm/pull/16 — main သို့ merge မလုပ်ရသေး။ Current main `32da6e4` ၏ portal separation/lifecycle ပြင်ချက်များကို release branch တွင်ပေါင်းထားသည်။

## ပြင်ဆင်ချက်

- Primary `#6023f2`၊ header `#f4efff`၊ selected filter `#e9e0ff`၊ user bubble `#f1edff` နှင့် အခြား token values များကို မူရင်း UI palette မှပြန်သုံးထားသည်။
- Mobile request form၊ category dropdown၊ user-right conversation နှင့် role-specific status labels ပါဝင်သည်။
- Backend/n8n request payload၊ production credentials နှင့် data schema မပြောင်းထားပါ။

## Verification

- Build/lint အောင်မြင်သည်။ Test files 43 / tests 162 အောင်မြင်သည်။
- GitHub Actions run `39170902323` အောင်မြင်သည်။
- Local Chromium: screen size ၅ မျိုး၌ theme/form/navigation/contrast/overflow စစ်ဆေးမှု အောင်မြင်သည်။ User/Admin edit-upload-approve နှင့် follow-up/end behavior ကို mocked data ဖြင့် 390/1280px တွင်စစ်ပြီးဖြစ်သည်။
- Live HTTP: user/admin pages 200၊ anonymous session 401၊ protected user/admin APIs နှင့် maintenance 403 ရရှိသည်။
- Live asset `/assets/index-2aU4v7lk.css` တွင် မူရင်း palette values ပါဝင်ကြောင်းစစ်ပြီးဖြစ်သည်။
- Live static frontend ကို mocked authorized data ဖြင့် 375/768/1024/1440px နှင့် 812×375 landscape တွင် browser စစ်ဆေးထားသည်။ Real login/PIN၊ real request creation သို့မဟုတ် live n8n dispatch မလုပ်ထားပါ။
- Browser verifier သည် minified CSS ၏ 3-digit hex colors ကိုလည်း normalize လုပ်ပြီး contrast စစ်နိုင်အောင် ပြင်ထားသည်။ ဤ verifier-only ပြင်ချက်သည် deployed application bundle ကို မပြောင်းပါ။
