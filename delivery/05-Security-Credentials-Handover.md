# 05 — Security & Credentials Handover

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

Credential custody model, rotation responsibility နှင့် HR data-privacy posture ကို သတ်မှတ်ရန်။ ဤ document သည် client ၏ HR data လုံခြုံရေးအတွက် တာဝန်ခွဲဝေမှုကို ရှင်းလင်းစေသည်။

## 2. Credential custody model (confirmed)

> **Confirmed posture** — production credential အားလုံးကို **vendor က hold/manage** လုပ်သည် (managed-service model)။

| Credential | Stored in | Custodian | မှတ်ချက် |
|---|---|---|---|
| Supabase service role key | n8n credential store | **Vendor** | server-side only, client-side မထည့်ရ |
| Supabase DB connection string | n8n credential store | **Vendor** | pooler host |
| OpenRouter API key | n8n credential store | **Vendor** | client account မှထုတ် (§ Document 04) |
| Embedding API key (Gemini/OpenRouter) | n8n credential store | **Vendor** | consolidation plan — § Document 04 |
| Supabase account login | Client account | **Client** | database ownership (§ Document 02) |
| OpenRouter account login | Client account | **Client** | funding ownership (§ Document 04) |

**Rationale** — client သည် account **ownership** (login, billing, data) ကိုပိုင်ဆိုင်ပြီး၊ vendor သည် operational **credential** (n8n တွင် wire လုပ်ထားသော key) ကို maintenance အတွက်ကိုင်ဆောင်သည်။ ဤ separation ဖြင့် client သည် အချိန်မရွေး key ကို revoke လုပ်ခြင်းဖြင့် vendor access ကို ရပ်တန့်နိုင်သည် (control ကို client လက်ထဲ ရှိစေ)။

## 3. Security invariants (delivered)

- Service-role key ကို client-side / Glide app ထဲ **ဘယ်တော့မှ မထည့်ရ**။
- Secrets ကို repository / documentation ထဲ မရေးရ။
- Privileged database operation များကို trusted n8n workflow boundary တွင်သာ ဆောင်ရွက်သည်။
- Sensitive field (`Sheet_AI_Answer`, `Consultant_Answer`) များကို normal-user device သို့ **မ sync** စေရ (Glide row-owner/role-restricted column — § Document 03)။

## 4. Credential rotation

| Event | Action | Owner |
|---|---|---|
| Routine rotation | ၆ လ/တစ်ကြိမ် key rotation recommend | Vendor |
| Vendor engagement end | Client က key/password အားလုံး rotate → vendor access ရပ် | Client |
| Suspected compromise | ချက်ချင်း rotate + audit | Vendor + Client |
| Key handover to client | Client-managed သို့ ပြောင်းလိုပါက secure channel | Both |

**Secure channel** — key/password ပေးအပ်ရာတွင် plain-text chat/email ကို မသုံးရ။ Password manager share, secret vault link, သို့မဟုတ် encrypted channel ကိုသာသုံးရန်။

## 5. HR data-privacy posture (⚠️ acknowledgment required)

> **Gate** — Real HR PII (employee name, salary, disciplinary record စသည်) ကို production တွင်စတင်အသုံးမပြုမီ client သည် အောက်ပါ posture ကို acknowledge လုပ်ရမည်။

**Data flow reality** — client ၏ HR data သည် client Supabase တွင်ရှိသော်လည်း၊ AI draft generation အတွက် **vendor-hosted n8n မှတစ်ဆင့် ဖြတ်သန်း၍ OpenRouter/embedding API သို့ပေးပို့ခံရသည်**။ ထို့ကြောင့် —

| Concern | Posture / Recommendation |
|---|---|
| PII → third-party model | HR question content သည် OpenRouter/model provider ထံရောက်သည်။ Provider ၏ data-retention policy ကို client acknowledge လုပ်ရန် |
| Consultant corrections | Approved KB knowledge နှင့် consultant correction ကို **သီးခြားထားရ**; learning ingestion မတိုင်မီ **de-identify** လုပ်ရ |
| Minimization | AI ထံပို့သည့် question တွင် မလိုအပ်သော PII (full name, ID) ကို ဖြတ်တောက်ရန် recommend |
| Access control | Sheet_AI_Answer / consultant field များ role-restricted (Glide — § Document 03) |
| Audit | Request / decision / approval ကို audit ပြန်လုပ်နိုင်ရမည် |

> **Recommendation** — production PII အသုံးမပြုမီ (1) model provider data-retention posture ကို client acknowledge, (2) consultant-correction learning loop ကို de-identification ဖြင့်သာ ingest, (3) sensitive field access ကို Glide row-owner security ဖြင့် enforce — ဤ ၃ ချက်ကို sign-off လုပ်ရန် (§ Document 07)။

## 6. Handover security checklist

- [ ] Client Supabase account credential — client သာသိမ်း
- [ ] Client OpenRouter account credential — client သာသိမ်း
- [ ] Vendor n8n credential — service key/API key wire (secure channel မှရ)
- [ ] Sensitive Glide field — row-owner/role-restricted (client enforce)
- [ ] PII posture acknowledgment — client sign-off (§ Document 07)
- [ ] Rotation policy — ၆ လ/တစ်ကြိမ် + engagement-end rotation သဘောတူ
