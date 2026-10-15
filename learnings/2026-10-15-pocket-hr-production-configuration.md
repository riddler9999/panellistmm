# Production environment promotion — verified failure

`panellistmm` Production configuration တွင် `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `POCKET_HR_SHEET_ID`,
`SUPABASE_URL` ကို decrypt လုပ်ပြီးနောက် encrypted envelope ထပ်ကျန်နေခဲ့သည်။
Values ရှိခြင်းနှင့် environment scope မှန်ခြင်းသာဖြင့် configuration မှန်သည်ဟု မယူဆရ။

ပြင်ဆင်မှု: source environment ၏ actual decrypted configuration ကို intended live system နှင့်တိုက်စစ်၊
destination ကို update၊ decrypt read-back equality စစ်၊ redeploy ပြီး runtime boundary အဆင့်ဆင့် verify လုပ်ခဲ့သည်။
Key/token values များကို log/report မလုပ်ခဲ့ပါ။

OAuth failure ဖြေရှင်းပြီးနောက် Sheets HTTP 403 `SERVICE_DISABLED` ထပ်ပေါ်လာသည်။
Credential shape၊ OAuth exchange၊ API enablement၊ file sharing၊ read/write permission တို့သည် သီးခြားစစ်ရမည့် boundaries ဖြစ်သည်။
`googleAuth.test.ts` သည် malformed service-account configuration နှင့် log redaction ကို ကာကွယ်သည်။

Full evidence: `work/reviews/2026-10-15-pocket-hr-production-remediation.md`။
