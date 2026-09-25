# Answer Viewer Production Integration Verification

Status: CODE/CI VERIFIED — PRODUCTION ROLLOUT BLOCKED

## Phase 1 prerequisite

Phase 1 PR #7 is merged. Its verification workflow is green and the recorded sandbox evidence covers tests, typecheck, lint, production build, Chromium viewports, HITL non-leakage, XSS controls, and mobile overflow checks.

No unresolved Critical/Important Phase 1 PR review findings were found.

## Current architecture discovered

The production delivery path is Glide + Google Sheet backed for ticket/HITL state, with n8n performing orchestration/AI draft generation and Supabase serving RAG/knowledge state.

Read-only live n8n inspection on 2026-09-25 found:
- workflow `I01u0vd30Db7xSfx` is inactive;
- ticket source is the Google Sheet bridge;
- current draft output field is `AI_Answer`;
- current review state is `Awaiting Review`;
- terminal guards include `Delivered` / `Failed`;
- artifact fields include `Artifact_Title`, `Artifact_URL`, `Artifact_Status`.

This materially conflicts with older repository documentation that names `Sheet_AI_Answer` and `Resolved`. Production rollout is blocked until one canonical n8n + Sheet + Glide contract is reconciled and verified.

## Source-of-truth decision

For Answer Viewer authorization, the existing Glide/Google Sheet ticket row is the current authoritative delivery-state source. No duplicate Supabase ticket table was added.

The viewer rechecks current state on every request, so a token does not preserve access after a ticket is reopened/non-visible.

## Security implementation

- Explicit allowlisted server projection; no raw row serialization.
- `AI_Answer`, `Sheet_AI_Answer`, and `Consultant_Answer` excluded from browser contract.
- HMAC-SHA256 signed token with ticket identity, issued/expiry timestamps and nonce only.
- Expiration rejects at the boundary timestamp.
- Token tampering, wrong secret, malformed token, cross-ticket mismatch, and expired token are rejected.
- Viewer credential is carried in URL fragment `/answer#access=...`, keeping it out of the initial HTTP request path/query.
- Protected API receives the credential in the Authorization header.
- Protected responses use `Cache-Control: private, no-store, max-age=0`, `Pragma: no-cache`, nosniff and no-referrer.
- Existing valid unexpired same-ticket links are reused; expired/wrong-ticket/unrelated links are rotated.
- Artifact projection drops malformed, HTTP, javascript and unsupported URLs before browser serialization.
- Phase 1 Markdown/XSS rendering protections remain in use.
- Observability events do not include answer bodies or raw tokens.
- Client build is scanned for `Sheet_AI_Answer` / `Consultant_Answer`; scan passed.

## Automated verification — GitHub Actions run #33 / 36125711906

- Unit + behavioral tests: PASS — 16 test files, 41 tests.
- Typecheck: PASS, including `api/` serverless function code.
- Lint: PASS.
- Production build: PASS.
- Client bundle internal-field scan: PASS.
- Chromium: PASS at 375, 390, 414, 768, 1280 widths.
- Browser cases: authorized answer, denied answer, long Burmese content, long artifact title, safe artifact action, no horizontal overflow, no relevant page errors.
- Browser screenshots: 6 files uploaded as CI artifact.

## HITL regression coverage

Covered:
- AI/draft exists + pending/review → denied
- Final_Answer missing → denied
- Final_Answer exists + non-client-visible state → denied
- approved terminal state + Final_Answer + valid token → visible
- invalid token → denied
- another-ticket token/row mismatch → denied
- expired token → denied
- reopened/non-visible ticket with old token → denied

Current server projection defaults to `Delivered` because that is the live n8n terminal-state evidence. This is fail-closed relative to older `Resolved` documentation, but must be reconciled with actual Glide Approve/Edit actions before rollout.

## Production systems touched

Read-only only:
- GitHub repository state/PR/CI
- live n8n workflow inspection

No production mutation:
- production n8n workflow: no edit/publish/activation
- Google Sheet: no write/schema change
- Glide: no configuration change
- Supabase: no schema/data change
- ticket data: no mutation

## Remaining production gates

1. Reconcile `AI_Answer` vs `Sheet_AI_Answer` and `Delivered` vs `Resolved` across live n8n + Sheet + Glide.
2. Decide/verify the actual private ticket-source endpoint/adapter configuration used by the serverless function.
3. Configure preview server secrets; no secrets are committed.
4. Perform production-like safe test-ticket integration.
5. Perform actual isolated Glide Web Embed verification. This has NOT been done and must not be claimed.
6. Verify real Glide iframe origin, then narrow `frame-ancestors` from the Phase 1 feasibility policy.
7. Consultant/admin UAT and normal-user UAT.
8. Explicit production rollout approval.

## Rollback

- stop generating/using `Answer_Viewer_URL`;
- hide/disable the new Web Embed;
- continue existing approved `Final_Answer` presentation;
- revert viewer deployment/code if required;
- preserve all existing tickets, drafts, consultant answers, final answers and artifacts;
- no database rollback is required because Phase 2 introduced no production schema migration.
