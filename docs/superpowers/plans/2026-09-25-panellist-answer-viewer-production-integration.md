# Pocket HR Partner Secure Answer Viewer Production Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the verified Phase 1 Answer Viewer to the current Panellist HITL ticket lifecycle with signed access, current-state authorization, server-side approved-only projection, safe artifact delivery, and staged Glide embed integration.

**Architecture:** Keep the existing viewer UI and XSS protections, replace the sandbox fixture resolver with a server-side adapter boundary, and use HMAC-signed opaque tokens that contain ticket identity and expiry but no HR content. The server re-reads the authoritative Google Sheet/Glide ticket row on every access and returns only an allowlisted `ClientVisibleHRAnswer` when the ticket is currently `Resolved` with non-empty `Final_Answer`. No new Supabase ticket table or destructive migration is introduced.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, server-side Node/Vercel functions, Web Crypto/Node crypto HMAC, existing Google Sheet/Glide integration, GitHub Actions, Playwright Chromium.

**Spec:** `docs/superpowers/specs/2026-09-25-panellist-secure-answer-viewer-production-integration-design.md`

## Global Constraints

- `Sheet_AI_Answer` and raw AI draft MUST NEVER be returned to normal-user browser payloads.
- `Consultant_Answer` MUST NEVER be returned before finalization and is excluded from the client contract entirely.
- Only current `Ticket_Status = Resolved` + non-empty `Final_Answer` is client-visible.
- Authorization and projection happen server-side before response serialization.
- Opaque IDs alone are not authorization.
- Tokens contain no HR answer content or artifact content.
- Production Supabase schema/data is not modified.
- Production n8n/Glide/Google Sheet changes are additive and not applied blindly from this PR.
- Existing `Final_Answer` Glide presentation remains as rollback/fallback until UAT and rollout approval.
- No direct merge to `main`.

## Review Focus

1. A valid token for a ticket that has been reopened must stop exposing the answer immediately.
2. A token signed for ticket A must never return ticket B even if path/query identifiers are tampered with.
3. Internal adapter rows containing `Sheet_AI_Answer` and `Consultant_Answer` must be structurally projected before serialization, not filtered in the browser.
4. Protected API responses must not be publicly cacheable and logs must not contain raw tokens or answer bodies.
5. Artifact fields with missing/malformed URLs, long titles, or multiple items must not leak internal paths or break mobile/embed layout.

---

### Task 1: Preserve and formalize the production client contract

**Files:**
- Modify: `apps/answer-viewer-sandbox/src/domain/hrAnswer.ts`
- Create: `apps/answer-viewer-sandbox/src/domain/clientVisibleAnswer.test.ts`
- Create: `apps/answer-viewer-sandbox/src/server/ticketRow.ts`
- Create: `apps/answer-viewer-sandbox/src/server/projectClientAnswer.ts`
- Create: `apps/answer-viewer-sandbox/src/server/projectClientAnswer.test.ts`

**Interfaces:**
- `TicketRow` is trusted server-only input and may contain internal fields.
- `projectClientAnswer(row: TicketRow): ClientVisibleHRAnswer | null`.
- Projection returns non-null only for exact resolved status and non-empty `Final_Answer`.
- Projection allowlists client fields and never spreads source rows.

- [ ] **Step 1: Write failing tests** for pending + draft, null final, non-resolved with final, resolved valid, and forbidden-field absence after JSON serialization.
- [ ] **Step 2: Run focused tests** and confirm RED because production projection does not exist.
- [ ] **Step 3: Implement minimal `TicketRow` and explicit projection mapper.** Do not use object spread from raw row into the client object.
- [ ] **Step 4: Re-run focused tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: add approved-only answer projection`.

### Task 2: Add signed viewer token contract

**Files:**
- Create: `apps/answer-viewer-sandbox/src/server/viewerToken.ts`
- Create: `apps/answer-viewer-sandbox/src/server/viewerToken.test.ts`

**Interfaces:**
- `createViewerToken({ticketId, now, ttlSeconds, secret}): string`.
- `verifyViewerToken({token, now, secret}): { ticketId: string; issuedAt: number; expiresAt: number; nonce: string } | null`.
- HMAC SHA-256 over versioned compact payload.
- Payload contains ticket ID/timestamps/nonce only.

- [ ] **Step 1: Write failing tests** for valid token, tamper rejection, expiry, malformed token, wrong secret, and payload not containing answer text.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement minimal HMAC token encoding/verification with constant-time signature comparison where supported.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `security: add signed answer viewer tokens`.

### Task 3: Add authoritative ticket repository interface and safe Sheet-backed adapter

**Files:**
- Create: `apps/answer-viewer-sandbox/src/server/ticketRepository.ts`
- Create: `apps/answer-viewer-sandbox/src/server/googleSheetTicketRepository.ts`
- Create: `apps/answer-viewer-sandbox/src/server/googleSheetTicketRepository.test.ts`
- Create: `apps/answer-viewer-sandbox/src/server/env.ts`

**Interfaces:**
- `TicketRepository.getByTicketId(ticketId): Promise<TicketRow | null>`.
- Production adapter performs exact row lookup by canonical ticket identifier.
- Credentials/Sheet identifiers come only from server environment.
- Adapter exposes no browser imports.

- [ ] **Step 1: Write failing adapter contract tests** around exact ticket lookup, no fallback, normalized missing fields, and absence of credential values in errors/log output.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement the repository interface plus Sheet-backed adapter boundary.** Keep transport injectable so tests use deterministic fixtures; do not commit credentials or production IDs.
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: add authoritative ticket repository adapter`.

### Task 4: Implement narrow authorized answer service

**Files:**
- Create: `apps/answer-viewer-sandbox/src/server/getAuthorizedAnswer.ts`
- Create: `apps/answer-viewer-sandbox/src/server/getAuthorizedAnswer.test.ts`
- Create: `apps/answer-viewer-sandbox/src/server/observability.ts`

**Interfaces:**
- `getAuthorizedAnswer({ token, now, secret, repository, logger }): Promise<AuthorizedAnswerResult>`.
- Result classes intentionally collapse externally to safe unavailable/denied behavior.
- Internal event names distinguish invalid token, not found, not resolved, and success without sensitive payloads.

- [ ] **Step 1: Write failing release-critical tests** for pending review denial, final null denial, status mismatch denial, valid resolved access, invalid token, another-ticket token, expired token, reopened ticket with old token, and exact projection.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement validation → exact lookup → current-state gate → projection in that order.**
- [ ] **Step 4: Assert logger events contain ticket-safe identifiers/event metadata only and never token/final/draft bodies.**
- [ ] **Step 5: Re-run tests** and confirm GREEN.
- [ ] **Step 6: Commit** `feat: enforce viewer authorization and current state`.

### Task 5: Add artifact projection from existing production fields

**Files:**
- Create: `apps/answer-viewer-sandbox/src/server/projectArtifacts.ts`
- Create: `apps/answer-viewer-sandbox/src/server/projectArtifacts.test.ts`
- Modify: `apps/answer-viewer-sandbox/src/server/projectClientAnswer.ts`

**Interfaces:**
- `projectArtifacts(row: TicketRow): HRArtifact[]`.
- Runtime field-name mapping is explicit and isolated.
- URLs remain HTTPS-only at rendering/action boundary.
- No second artifact persistence system.

- [ ] **Step 1: Write failing tests** for zero, one, multiple, malformed URL, missing title, long title, and supported SOP/org-chart/form/file cases using the verified mapping contract.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement explicit artifact normalization without exposing internal storage metadata.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: map production artifacts into viewer contract`.

### Task 6: Implement protected API endpoint and no-store policy

**Files:**
- Create: `apps/answer-viewer-sandbox/api/answer-viewer/[token].ts`
- Create: `apps/answer-viewer-sandbox/src/server/httpResponse.ts`
- Create: `apps/answer-viewer-sandbox/src/server/httpResponse.test.ts`

**Interfaces:**
- `GET /api/answer-viewer/:token` returns only `ClientVisibleHRAnswer` on authorized success.
- Error bodies do not reveal whether a ticket exists.
- Headers include private/no-store behavior.

- [ ] **Step 1: Write failing endpoint/response tests** for success projection, invalid token, not-found/non-resolved indistinguishability, no-store headers, and no forbidden fields.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement endpoint with server-only env/repository construction.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: add protected answer viewer endpoint`.

### Task 7: Replace fixture-only viewer data path while keeping sandbox fixtures for tests

**Files:**
- Create: `apps/answer-viewer-sandbox/src/data/productionAnswerClient.ts`
- Modify: `apps/answer-viewer-sandbox/src/routes/AnswerPage.tsx`
- Modify: `apps/answer-viewer-sandbox/src/routes/AnswerPage.test.tsx`
- Preserve: `apps/answer-viewer-sandbox/src/data/answerFixtures.ts` for deterministic test/demo coverage only

**Interfaces:**
- Production route uses signed token and protected API.
- Client receives only projected answer JSON.
- Loading, unavailable, access-denied, and render-failure states are safe.

- [ ] **Step 1: Write failing component tests** proving browser-side code never receives or references draft fields and pending/invalid states display safe messages.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement production API fetch path and route token handling.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: connect viewer to protected answer API`.

### Task 8: Production link generation and idempotent integration contract

**Files:**
- Create: `apps/answer-viewer-sandbox/src/server/createAnswerViewerUrl.ts`
- Create: `apps/answer-viewer-sandbox/src/server/createAnswerViewerUrl.test.ts`
- Create: `docs/integrations/panellist-answer-viewer-n8n-contract.md`

**Interfaces:**
- `createAnswerViewerUrl({ticketId, baseUrl, now, ttlSeconds, secret})`.
- Same ticket/approved state can be processed repeatedly without creating duplicate persistence records.
- n8n receives/writes a complete URL only after approval; it does not generate HTML or manually construct signatures.

- [ ] **Step 1: Write failing tests** for valid URL, no answer content in URL, tamper resistance, and stable behavior under repeated approved processing according to the chosen token policy.
- [ ] **Step 2: Run focused tests** and confirm RED.
- [ ] **Step 3: Implement URL generation plus n8n integration documentation.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `feat: define idempotent answer viewer link generation`.

### Task 9: Glide contract and backward-compatible rollout docs

**Files:**
- Create: `docs/integrations/panellist-answer-viewer-glide-contract.md`
- Modify: `delivery/01-System-Architecture.md`
- Modify: `delivery/03-n8n-Operations-Guide.md`
- Modify: `project/ARCHITECTURE.md`
- Modify: `project/CURRENT_STATE.md`

**Interfaces:**
- Canonical field: `Answer_Viewer_URL` unless a verified existing equivalent exists.
- Viewer visible only for Resolved + URL.
- Existing Final_Answer presentation remains fallback during staged rollout.
- Documentation corrects the Google Sheet/Glide vs Supabase ticket-state drift.

- [ ] **Step 1: Update docs with exact source-of-truth and responsibility boundaries.**
- [ ] **Step 2: Record exact additive Glide mapping change and rollback steps.**
- [ ] **Step 3: Search docs for contradictory ticket-state ownership claims and reconcile them without changing RAG ownership.**
- [ ] **Step 4: Commit** `docs: define answer viewer production integration contract`.

### Task 10: Security regression suite and content safety

**Files:**
- Modify: `apps/answer-viewer-sandbox/src/components/SafeAnswerContent.test.tsx`
- Modify: `apps/answer-viewer-sandbox/src/domain/artifactUrl.test.ts`
- Create: `apps/answer-viewer-sandbox/src/securityRegression.test.tsx`

**Interfaces:**
- Raw HTML/scripts/event handlers/javascript URLs remain inert.
- External links have intentional target/rel behavior.
- Long Burmese answers and artifact titles remain layout-safe.

- [ ] **Step 1: Add failing regression tests** for script/event-handler/javascript-link payloads through the real production client contract path.
- [ ] **Step 2: Run tests and confirm RED where new coverage exposes missing behavior.**
- [ ] **Step 3: Make minimal implementation fixes only if required.**
- [ ] **Step 4: Re-run tests** and confirm GREEN.
- [ ] **Step 5: Commit** `test: protect secure viewer rendering boundary`.

### Task 11: Embed CSP, cache/privacy, and browser verification automation

**Files:**
- Modify: `apps/answer-viewer-sandbox/vercel.json`
- Modify: `apps/answer-viewer-sandbox/src/embedHeaders.test.ts`
- Modify: `apps/answer-viewer-sandbox/scripts/verify-browser.mjs`
- Modify: `.github/workflows/answer-viewer-sandbox.yml`

**Interfaces:**
- Protected response caching is disabled.
- `frame-ancestors` is narrowed only to verified Glide origin(s); otherwise remain preview-only and block production-ready claim.
- Browser matrix: 375, 390, 414, tablet-ish, desktop.

- [ ] **Step 1: Write failing header/browser assertions** for no-store behavior, target viewport sizes, invalid/expired state, artifact rendering, long Burmese answer, no overflow, and console errors.
- [ ] **Step 2: Run tests and confirm RED.**
- [ ] **Step 3: Update config/scripts minimally.**
- [ ] **Step 4: Run production build preview + Chromium verification.**
- [ ] **Step 5: Commit** `test: verify secure viewer browser and embed contract`.

### Task 12: Full verification and evidence report

**Files:**
- Create: `work/reviews/2026-09-25-answer-viewer-production-integration-verification.md`

- [ ] **Step 1: Run full `npm test -- --run`.**
- [ ] **Step 2: Run `npm run typecheck`.**
- [ ] **Step 3: Run `npm run lint`.**
- [ ] **Step 4: Run `npm run build`.**
- [ ] **Step 5: Run production-like Chromium verification at 375/390/414/tablet/desktop.**
- [ ] **Step 6: Inspect client/network payloads and built artifacts for forbidden draft fields, secrets, raw tokens in logs, and public-caching headers.**
- [ ] **Step 7: Record exact observed evidence; do not claim Glide verification unless it was actually executed in Glide.**
- [ ] **Step 8: Commit** `test: record secure answer viewer verification evidence`.

### Task 13: Glide isolated embed verification gate

**Files:**
- Update only the verification record after actual isolated Glide test.

- [ ] **Step 1: Use the safest available isolated Glide surface, not destructive live-user changes.**
- [ ] **Step 2: Verify page load, iframe navigation/auth, responsive width, scrolling, Burmese typography, artifacts, pending denial, and resolved approved-only rendering.**
- [ ] **Step 3: Record exact evidence and actual Glide origin.**
- [ ] **Step 4: Narrow CSP to verified origin if required and rerun build/browser checks.**
- [ ] **Step 5: If Glide access/tooling is unavailable, mark this gate BLOCKED and do not claim production readiness.**

### Task 14: Final review and PR

**Files:**
- No unrelated production mutations.

- [ ] **Step 1: Compare branch against `main` and review every changed file against this plan.**
- [ ] **Step 2: Use requesting-code-review; fix all Critical/Important findings with TDD and rerun affected/full gates.**
- [ ] **Step 3: Confirm production Supabase data/schema was not modified and no destructive Sheet/Glide change occurred.**
- [ ] **Step 4: Create dedicated PR titled `feat: integrate secure Pocket HR Partner answer viewer`.**
- [ ] **Step 5: PR body must include architecture, data flow, authorization, production systems touched/not touched, n8n/Glide changes, tests, browser evidence, security review, rollback, and remaining UAT.**
- [ ] **Step 6: Leave PR unmerged pending explicit approval/UAT.**

## Deployment Order

1. merge-ready code and tests only after review
2. preview deployment
3. configure server secrets in preview
4. safe test-ticket data adapter
5. browser verification
6. isolated Glide embed
7. consultant/admin UAT
8. normal-user UAT
9. explicit production rollout decision

## Backward Compatibility

- Existing `Final_Answer` path stays functional.
- No destructive migration.
- `Answer_Viewer_URL` is additive.
- Viewer failure never falls back to AI draft.
- Rollback requires disabling URL generation/embed and returning to existing approved Final_Answer presentation only.

## Rollback Procedure

1. Disable viewer URL generation/use in the integration layer.
2. Hide/disable the Glide Web Embed component.
3. Keep current `Final_Answer` display path active.
4. Revert viewer deployment/code if required.
5. Preserve existing tickets, `Sheet_AI_Answer`, `Consultant_Answer`, `Final_Answer`, review metadata and artifacts.
6. No database reversal is required because this plan introduces no production schema migration.
