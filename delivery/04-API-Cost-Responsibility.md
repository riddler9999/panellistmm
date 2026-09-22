# 04 — API & Cost Responsibility

> Panellist HR AI System · Client Delivery Package v1.0 · 2026-09-22

---

## 1. Objective

AI model API များ (LLM + embedding) ၏ cost ownership၊ funding responsibility နှင့် operational setup ကို ရှင်းရှင်းလင်းလင်း သတ်မှတ်ရန်။

## 2. Cost ownership model

| Cost item | Account owner | Funding responsibility |
|---|---|---|
| **OpenRouter (LLM — AI draft generation)** | **Client** (`<CLIENT_GMAIL>`) | Client (initial top-up by vendor) |
| **Embedding** (`gemini-embedding-001` @1536) | လက်ရှိ Gemini → consolidating to OpenRouter | Client |
| Supabase database | Client | Client (§ Document 02) |
| n8n hosting + maintenance | Vendor server | Client လစဉ်ပေးချေ (§ Document 06) |

**Principle** — AI usage spend အားလုံးကို client ၏ကိုယ်ပိုင် account မှ ကျခံသည်။ ဤ model ၏ engineering rationale — usage-based AI cost ကို client ကိုယ်တိုင် transparent မြင်နိုင်စေရန်၊ vendor ၏ maintenance fee နှင့် variable AI cost ကို ရောနှောမထားရန်။

## 3. Current & planned model routing

| Function | လက်ရှိ (current) | အနာဂတ် (planned) |
|---|---|---|
| LLM draft generation | OpenRouter | OpenRouter (unchanged) |
| Embedding | Gemini `gemini-embedding-001` @1536 (direct) | **OpenRouter မှတစ်ဆင့် Gemini** (consolidated) |

> **Consolidation plan** — embedding ကိုပါ OpenRouter မှတစ်ဆင့် route လုပ်ရန် စီစဉ်ထားသည်။ ထိုအခါ AI spend အားလုံး **OpenRouter account တစ်ခုတည်း** တွင် စုစည်းသွားမည် — billing/monitoring ရိုးရှင်းသွားပြီး API key တစ်မျိုးတည်း manage လုပ်ရုံဖြင့်ရသည်။ ⚠️ Embedding model dimension parity (`1536`) ကို consolidation အချိန်တွင် ထိန်းသိမ်းရမည် — dimension ပြောင်းပါက `hr_kb` re-embedding လိုအပ်မည်။

## 4. Initial funding (current status)

| Item | Amount | Status |
|---|---|---|
| OpenRouter initial top-up | **50,000 MMK** worth | ✅ Vendor pre-funded (goodwill / ramp-up) |
| Ongoing top-up | Usage-based | ⏳ **Client responsibility going forward** |

> Vendor ၏ initial 50,000 MMK top-up သည် ramp-up အတွက် one-time goodwill ဖြစ်သည်။ ၎င်းပြီးနောက် OpenRouter balance top-up အားလုံးကို client တာဝန်ယူသည်။

## 5. Client setup steps (OpenRouter)

1. Client OpenRouter account (`<CLIENT_GMAIL>`) → **Credits** → balance top-up (card / supported payment)။
2. API key ဖန်တီး → vendor ကို secure channel မှတစ်ဆင့်ပေးအပ် (n8n credential အတွက် — § Document 05)။ ⚠️ Key ကို chat/email plain-text ဖြင့် မပို့ရ။
3. Usage limit / spend cap (optional but recommended) — runaway cost ကာကွယ်ရန် monthly cap သတ်မှတ်ရန်။

## 6. Cost monitoring & guardrails

| Guardrail | Recommendation |
|---|---|
| Low-balance alert | OpenRouter balance threshold alert ဖွင့်ရန် |
| Monthly spend cap | Client ၏ risk tolerance အလိုက် cap သတ်မှတ်ရန် |
| Usage review | လစဉ် vendor maintenance report တွင် approximate usage ဖော်ပြ (§ Document 06) |

> **Recommendation** — production traffic တက်လာသည်နှင့်အမျှ AI cost မြင့်တက်နိုင်သည်။ Balance အား weekly စစ်ဆေးပြီး low-balance alert ဖွင့်ထားရန် အကြံပြုသည်။ Balance ကုန်ပါက AI draft generation ရပ်တန့်မည် (consultant manual answer ဖြင့်သာ ဆက်လုပ်နိုင်)။
