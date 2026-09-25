# Answer Viewer Sandbox Verification

Status: IMPLEMENTATION IN REVIEW — runtime verification pending CI/browser execution.

## Isolation evidence

- Branch: `feat/answer-viewer-sandbox`; `main` not modified by this phase.
- Sandbox source lives under `apps/answer-viewer-sandbox`.
- No Supabase migration/data mutation is part of the branch.
- No production n8n workflow mutation was executed.
- No Google Sheets mapping mutation was executed.
- No Glide configuration mutation was executed.
- Client contract intentionally excludes `Sheet_AI_Answer` and raw AI draft fields.

## Implemented behavioral gates

- Resolved + non-empty final answer is the only renderable answer state.
- Pending and expired fixtures deliberately contain sentinel final-answer text; component tests require those sentinels to remain absent from the DOM.
- Invalid key and unknown valid-format key are separate safe states with no fallback.
- Markdown renderer skips raw HTML and blocks unsafe link schemes.
- Artifact actions validate HTTPS URLs.
- Answer-route iframe headers are scoped in sandbox `vercel.json`; sandbox `frame-ancestors https:` is feasibility-only and not the Phase 2 production allowlist.

## Verification commands

Run from `apps/answer-viewer-sandbox`:

```bash
npm install
npm test -- --run
npm run typecheck
npm run lint
npm run build
```

Browser matrix still to record with observed evidence: 320, 390, 430, 768, 1280 CSS px. Do not mark Phase 1 complete until runtime command output and browser evidence have been observed.

## Production integration boundary

Opaque key entropy is not authorization. Phase 2 requires authenticated or signed server-side lookup, request/ticket authorization, approved-only projection, expiry/revocation/audit semantics, and verified Glide iframe origin policy before production data is connected.
