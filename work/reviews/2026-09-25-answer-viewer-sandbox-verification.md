# Answer Viewer Sandbox Verification

Status: VERIFIED FOR PHASE 1 SANDBOX / NOT PRODUCTION DATA CONNECTED

## Verified branch state

- Branch: `feat/answer-viewer-sandbox`
- Verified implementation head: `026051888b6d3e74f49c95d3113ba30cb0c2b469`
- GitHub Actions workflow: `Answer Viewer Sandbox Verification`
- Successful run: `#9` / run ID `36120697911`
- Browser evidence artifact: `answer-viewer-browser-verification` / artifact ID `10857955008`
- Artifact digest: `sha256:dd3af486d42c4dcae15ca1ee235dea54f4cccbda36adccebc3dbda7d2d23223f`

## Runtime / build verification

GitHub-hosted Ubuntu runner ပေါ်တွင် အောက်ပါ gates များကို actual execute လုပ်ထားသည်။

- `npm install` — PASS, 0 vulnerabilities reported by npm audit summary.
- `npm test -- --run` — PASS.
  - 7 test files passed.
  - 16 tests passed.
  - 0 failed.
- `npm run typecheck` — PASS.
- `npm run lint` — PASS.
- `npm run build` — PASS.
- Built `dist` ကို `vite preview` ဖြင့် serve ပြီး Chromium browser verification လုပ်ထားသည် — PASS.

## Browser verification

Playwright Chromium ကို production build preview အပေါ် run လုပ်ထားသည်။

Verified viewport widths:

- 320px
- 390px
- 430px
- 768px
- 1280px

Verified behavior:

- resolved answer page loads;
- Burmese final answer renders;
- bundled `Noto Sans Myanmar` webfont loads;
- document-level horizontal overflow မရှိ;
- multiple artifact cards render;
- pending-review fixture တွင် hidden final-answer sentinel မပေါ်;
- expired fixture တွင် hidden final-answer sentinel မပေါ်;
- unknown opaque key → Answer Not Found;
- invalid key → Invalid Answer Link;
- malicious fixture မှ raw script payload execute မဖြစ်;
- `javascript:` URL actionable link မဖြစ်;
- unsafe artifact URL → non-actionable `Link unavailable`.

Browser log output:

`Browser verification passed for 320, 390, 430, 768, 1280 widths and HITL/security states.`

## Visual evidence review

GitHub Actions screenshot artifact ကို download ပြီး manual visual review လုပ်ထားသည်။

Observed:

- 320px resolved screen တွင် Myanmar shaping / line wrapping မှန်ကန်သည်။
- Initial CI screenshot တွင် runner system font ကြောင့် Burmese shaping ပျက်ခဲ့သည်; `@fontsource/noto-sans-myanmar` bundle ထည့်ပြီး regression browser assertion ဖြင့် fix ကို verify လုပ်ထားသည်။
- 390px multiple-artifact screen တွင် long title, buttons, cards မကျိုးဘဲ responsive ဖြစ်သည်။
- malicious fixture တွင် unsafe attachment link actionable မဖြစ်ဘဲ `Link unavailable` ပြသည်။

## HITL / security verification

- Client-facing `HRAnswer` contract တွင် `Sheet_AI_Answer` / raw AI draft field မပါ။
- `status === "resolved"` + non-empty `finalAnswer` ဖြစ်မှ Final Answer render လုပ်သည်။
- Pending / expired states တွင် fixture ထဲ finalAnswer sentinel ရှိနေတောင် DOM ထဲမပေါ်။
- Raw HTML execution မသုံး။
- `dangerouslySetInnerHTML` မသုံး။
- Raw HTML parsing plugin မသုံး။
- Artifact actions သည် HTTPS URL ကိုသာ actionable လုပ်သည်။
- Unknown key သည် default/fallback answer တစ်ခုကို မရောက်။
- Opaque key ကို production authorization အဖြစ် မယူထားကြောင်း documentation တွင် explicit လုပ်ထားသည်။

## Embed verification

- `vercel.json` header rule ကို `/answer/(.*)` scope အတွင်းသာထားသည်။
- `X-Frame-Options: DENY/SAMEORIGIN` မသုံး။
- Sandbox CSP တွင် `frame-ancestors https:` ကို feasibility-only policy အဖြစ်ထားသည်။
- `X-Content-Type-Options: nosniff` ပါသည်။
- `Referrer-Policy: no-referrer` ပါသည်။
- Phase 2 production integration မတိုင်ခင် actual Glide origin ကို verify လုပ်ပြီး `frame-ancestors` ကို narrow လုပ်ရမည်။

## Production isolation evidence

ဒီ Phase 1 execution အတွင်း:

- Production Supabase schema/data — NOT modified.
- Production Supabase migration — NOT applied.
- Production n8n workflows — NOT modified.
- Google Sheets mappings — NOT modified.
- Glide production configuration — NOT modified.
- Existing consultant HITL approval behavior — NOT modified.
- Production data adapter — NOT connected.

## Non-blocking observation

GitHub-hosted runner က `actions/checkout@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4` တို့၏ Node 20 deprecation warning ကို report လုပ်ထားသည်။ Verification result ကိုမထိခိုက်ဘဲ GitHub Actions ecosystem-level warning ဖြစ်သည်။

## Phase 2 production boundary

Phase 2 မှာသာ:

1. authenticated/signed server-side answer lookup;
2. request/ticket authorization;
3. approved-only `Final_Answer` projection;
4. expiry/revocation semantics;
5. access/audit logging;
6. verified Glide iframe origin allowlist;
7. production data adapter;
8. production integration regression tests

ကိုထည့်ရမည်။

Opaque answer key entropy တစ်ခုတည်းကို authorization အဖြစ် မသုံးရ။
