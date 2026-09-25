# Pocket HR Partner Answer Viewer Sandbox

**SANDBOX / NOT PRODUCTION DATA CONNECTED**

ဒီ app က Glide Web Embed feasibility နဲ့ client-facing presentation contract ကိုစမ်းရန်သာဖြစ်သည်။ Supabase, n8n, Google Sheets, Glide production configuration တစ်ခုမှ မချိတ်ထားပါ။ `Sheet_AI_Answer`/raw AI draft သည် client contract ထဲမပါပါ။

## Local run

```bash
npm install
npm run dev
npm test -- --run
npm run typecheck
npm run lint
npm run build
```

## Routes / fixture keys

- `/answer/phr_sbx_a4f19c82d7e641b39a60c52e` — long Burmese resolved answer, zero artifacts
- `/answer/phr_sbx_b51d8e74f9a240c1ab73d620` — resolved + SOP
- `/answer/phr_sbx_c62e9f85a0b341d2bc84e731` — multiple artifacts
- `/answer/phr_sbx_d73fa096b1c452e3cd95f842` — pending review; fixture deliberately carries hidden content to regression-test the HITL gate
- `/answer/phr_sbx_e840b1a7c2d563f4de06a953` — expired; hidden content must not render
- `/answer/phr_sbx_f951c2b8d3e674a5ef17ba64` — structured table/callout
- `/answer/phr_sbx_0a62d3c9e4f785b6fa28cb75` — malicious markup/unsafe URL fixture

## Embed assumptions

`vercel.json` scopes iframe-related CSP to `/answer/(.*)`. Sandbox `frame-ancestors https:` is intentionally broad only to prove embedding feasibility. Phase 2 must replace this with verified Glide origins and production authorization. `X-Frame-Options` is intentionally omitted because legacy DENY/SAMEORIGIN would block the cross-origin embed.

## Security boundary

Final Answer is rendered only when `status === "resolved"` and non-empty `finalAnswer` exists. Markdown raw HTML is skipped; no `dangerouslySetInnerHTML` or raw-HTML plugin is used. Artifact actions accept HTTPS only. Opaque answer keys prevent simple sequential URLs but are **not authorization**.

## Known limitations / Phase 2 requirements

There is no production data adapter, authentication, signed access, revocation, audit event, or verified Glide-origin allowlist in Phase 1. Phase 2 must implement an authorized server-side lookup that returns only the approved client projection and independently enforces the HITL boundary.
