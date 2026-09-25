# Pocket HR Partner Sandbox Answer Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Glide Web Embed အတွင်း နောက်ပိုင်း production integration လုပ်နိုင်မည့် Pocket HR Partner mobile-first Answer Viewer ကို production systems မထိဘဲ deterministic mock data ဖြင့် prove လုပ်ရန်။

**Architecture:** Repo အတွင်း isolated `apps/answer-viewer-sandbox` Vite + React + TypeScript app တစ်ခုထားမည်။ Dynamic `/answer/:answerKey` route သည် local fixture resolver ကိုသာခေါ်မည်; Supabase, n8n, Google Sheets, Glide runtime API မချိတ်ရ။ Presentation boundary တွင် typed `HRAnswer` contract, explicit visibility gate, safe markdown renderer နှင့် artifact presentation ကိုခွဲထားပြီး Phase 2 တွင် fixture resolver ကို authorized production adapter ဖြင့်လဲနိုင်အောင်ထားမည်။

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, React Router, `react-markdown` + `remark-gfm` (raw HTML parsing plugin မသုံး), CSS mobile-first layout.

**Spec:** Owner-approved Phase 1 contract in the 2026-09-25 task brief; repository authority: `project/ARCHITECTURE.md`, `project/SCOPE.md`, `project/CURRENT_STATE.md`, `AGENTS.md`.

## Global Constraints

- SANDBOX / NOT PRODUCTION DATA CONNECTED.
- `Sheet_AI_Answer` နှင့် raw AI draft field မည်သည့် client contract/fixture/component တွင်မျှ မပါရ။
- `status === "resolved" && finalAnswer !== null` ဖြစ်မှ Final Answer render ရမည်။
- `pending_review`, `expired`, invalid/unknown keys တွင် answer body မပေါ်ရ။
- Production Supabase schema/data, production n8n workflows, Google Sheets mappings, Glide configuration နှင့် existing HITL behavior မပြောင်းရ။
- n8n က orchestration/data producer ဖြစ်မည်; static HTML page-per-answer မထုတ်ရ။
- Opaque answer key သည် production authorization မဟုတ်ကြောင်း documentation တွင်ရှင်းရမည်။
- Embed headers ကို Answer Viewer sandbox scope အတွင်းသာပြင်ရမည်; global security weakening မလုပ်ရ။
- Repository docs အသစ်/ပြင်ဆင်ချက်ကို Burmese-first ရေးပြီး technical identifiers ကို English အတိုင်းထားရမည်။

## Review Focus

1. Fixture object ထဲ accidental `finalAnswer` ပါနေသည့် `pending_review`/`expired` case တွင်တောင် UI က content ကို မrender ရ။
2. `<script>`, event-handler-like markup နှင့် `javascript:` links ပါသည့် untrusted content သည် executable DOM/script မဖြစ်ရ။
3. Unknown opaque key တစ်ခုသည် fallback/default fixture သို့မကျဘဲ Not Found ဖြစ်ရ။
4. Extremely long Burmese tokens, table cells နှင့် artifact titles ကြောင့် mobile horizontal overflow မဖြစ်ရ။
5. External artifact URL scheme သည် `https:` only ဖြစ်ရပြီး unsafe URL ကို actionable link မလုပ်ရ။

---

### Task 1: Sandbox app skeleton + contract boundary

**Files:**
- Create: `apps/answer-viewer-sandbox/package.json`
- Create: `apps/answer-viewer-sandbox/tsconfig.json`
- Create: `apps/answer-viewer-sandbox/vite.config.ts`
- Create: `apps/answer-viewer-sandbox/index.html`
- Create: `apps/answer-viewer-sandbox/src/domain/hrAnswer.ts`
- Create: `apps/answer-viewer-sandbox/src/domain/hrAnswer.test.ts`
- Create: `apps/answer-viewer-sandbox/src/main.tsx`

**Interfaces:**
- Produces `HRAnswerStatus = "pending_review" | "resolved" | "expired"`.
- Produces `HRArtifactType = "sop" | "org_chart" | "form" | "file"`.
- Produces `HRAnswer` with `answerKey`, `ticketId`, `title`, `status`, `finalAnswer`, `artifacts`, optional `reviewedBy/reviewedAt`, and `updatedAt`; no draft field.
- Produces `canRenderFinalAnswer(answer: HRAnswer): boolean`.

- [ ] **Step 1: Write failing contract tests** proving only resolved + non-null answer returns true and the public fixture/type surface has no draft field.
- [ ] **Step 2: Run** `cd apps/answer-viewer-sandbox && npm test -- --run src/domain/hrAnswer.test.ts` and confirm RED.
- [ ] **Step 3: Implement minimal typed contract and visibility predicate.**
- [ ] **Step 4: Re-run focused test and confirm GREEN.**
- [ ] **Step 5: Commit** `feat: scaffold sandbox answer viewer contract`.

### Task 2: Deterministic fixture resolver and key validation

**Files:**
- Create: `apps/answer-viewer-sandbox/src/data/answerFixtures.ts`
- Create: `apps/answer-viewer-sandbox/src/data/answerRepository.ts`
- Create: `apps/answer-viewer-sandbox/src/data/answerRepository.test.ts`

**Interfaces:**
- `isValidSandboxAnswerKey(value: string): boolean` accepts only `phr_sbx_` + 24 lowercase hex characters.
- `getSandboxAnswer(answerKey: string): HRAnswer | null` performs exact lookup only; no fallback.
- Fixtures cover long Burmese resolved, SOP, multiple artifacts, pending review, expired, long structured content, malicious markup.

- [ ] **Step 1: Write failing resolver tests** for valid, invalid, unknown, pending/expired with deliberately populated hidden `finalAnswer`, malicious markup, zero/one/multiple artifacts.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Implement deterministic fixtures and exact resolver.** Use stable opaque keys such as `phr_sbx_a4f19c82d7e641b39a60c52e`; never sequential IDs.
- [ ] **Step 4: Re-run focused tests and confirm GREEN.**
- [ ] **Step 5: Commit** `test: add deterministic answer viewer fixtures`.

### Task 3: Safe rich-answer renderer + artifact URL policy

**Files:**
- Create: `apps/answer-viewer-sandbox/src/components/SafeAnswerContent.tsx`
- Create: `apps/answer-viewer-sandbox/src/components/SafeAnswerContent.test.tsx`
- Create: `apps/answer-viewer-sandbox/src/domain/artifactUrl.ts`
- Create: `apps/answer-viewer-sandbox/src/domain/artifactUrl.test.ts`

**Interfaces:**
- `SafeAnswerContent({content}: {content: string})` renders Markdown/GFM without raw HTML execution.
- `getSafeArtifactUrl(url: string): string | null` returns URL only when protocol is `https:`.

- [ ] **Step 1: Write failing behavioral tests** for headings, lists, tables, links, `<script>`, inline HTML and `javascript:` URL handling.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Implement renderer with `react-markdown` + `remark-gfm`; do not install/use `rehype-raw` and do not use `dangerouslySetInnerHTML`. Implement HTTPS artifact URL validation.**
- [ ] **Step 4: Re-run focused tests and confirm GREEN.**
- [ ] **Step 5: Commit** `feat: render HR answers safely`.

### Task 4: Answer route and HITL states

**Files:**
- Create: `apps/answer-viewer-sandbox/src/App.tsx`
- Create: `apps/answer-viewer-sandbox/src/routes/AnswerPage.tsx`
- Create: `apps/answer-viewer-sandbox/src/routes/AnswerPage.test.tsx`
- Create: `apps/answer-viewer-sandbox/src/components/ArtifactCard.tsx`
- Create: `apps/answer-viewer-sandbox/src/components/StatusState.tsx`

**Interfaces:**
- Route `/answer/:answerKey` resolves local repository result.
- Answer page owns loading/resolved/pending/expired/not-found/invalid/render-error states.
- Artifact action labels: `sop` → `View Diagram`; `org_chart` → `View Organization Chart`; `form` → `Download Form`; `file` → `Open Attachment`.

- [ ] **Step 1: Write failing route/component tests** proving resolved visible, pending hidden even if fixture carries content, expired hidden, invalid safe failure, unknown Not Found, artifact/no-artifact/multi-artifact behavior and render-error boundary.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Implement minimal route/page/state/artifact components.** External artifact links use `target="_blank" rel="noopener noreferrer"`; unsafe URLs render non-actionable metadata only.
- [ ] **Step 4: Re-run focused tests and confirm GREEN.**
- [ ] **Step 5: Commit** `feat: add sandbox answer route and HITL states`.

### Task 5: Mobile-first Pocket HR presentation and overflow contract

**Files:**
- Create: `apps/answer-viewer-sandbox/src/styles.css`
- Create: `apps/answer-viewer-sandbox/src/layoutContract.test.tsx`
- Modify: `apps/answer-viewer-sandbox/src/routes/AnswerPage.tsx`

**Interfaces:**
- Single-column embedded shell; no dashboard/navigation chrome.
- Content uses `min-width: 0`, `overflow-wrap: anywhere` where needed, responsive tables inside horizontal-safe wrapper, touch-sized artifact actions.

- [ ] **Step 1: Write failing DOM/style contract tests** for required responsive classes and absence of page-level forced minimum width.
- [ ] **Step 2: Run focused tests and confirm RED.**
- [ ] **Step 3: Implement mobile-first CSS** for narrow/standard/large phone, tablet-ish and desktop widths; prioritize Burmese line-height and readable measure.
- [ ] **Step 4: Run component suite and verify GREEN.**
- [ ] **Step 5: Commit** `style: add mobile-first Pocket HR answer viewer`.

### Task 6: Narrowly scoped embed headers

**Files:**
- Create: `apps/answer-viewer-sandbox/vercel.json`
- Create: `apps/answer-viewer-sandbox/src/embedHeaders.test.ts`

**Interfaces:**
- `/answer/(.*)` receives explicit CSP suitable for sandbox embed and security headers.
- No repo-global header change.

- [ ] **Step 1: Write failing config test** that parses `vercel.json`, checks header scope is `/answer/(.*)`, rejects `X-Frame-Options: DENY/SAMEORIGIN`, and requires intentional `Content-Security-Policy` `frame-ancestors` documentation.
- [ ] **Step 2: Run focused test and confirm RED.**
- [ ] **Step 3: Add scoped headers.** For sandbox feasibility use an explicitly documented permissive `frame-ancestors https:` policy rather than a global policy; Phase 2 must replace it with the verified Glide origin/auth design. Add `X-Content-Type-Options: nosniff` and `Referrer-Policy: no-referrer`.
- [ ] **Step 4: Re-run config test and confirm GREEN.**
- [ ] **Step 5: Commit** `security: scope answer viewer embed headers`.

### Task 7: Documentation and production-isolation proof

**Files:**
- Create: `apps/answer-viewer-sandbox/README.md`
- Create: `work/reviews/2026-09-25-answer-viewer-sandbox-verification.md`
- Modify only if verified necessary: `project/ARCHITECTURE.md` (document sandbox presentation boundary without changing production runtime architecture).

**Interfaces:**
- README lists fixture keys, local commands, embed assumptions, known limitations, and `SANDBOX / NOT PRODUCTION DATA CONNECTED` warning.
- Verification report records evidence that no Supabase schema/data mutation, n8n, Sheets or Glide mutation occurred.

- [ ] **Step 1: Add documentation with exact fixture keys and run/test/build commands.**
- [ ] **Step 2: Search sandbox source for forbidden production coupling:** `Sheet_AI_Answer`, Supabase client imports/URLs, n8n production endpoints, Google Sheets IDs/secrets. Expected: none except explicit negative documentation/tests.
- [ ] **Step 3: Run `npm test -- --run`, `npm run typecheck`, `npm run lint`, `npm run build`.** Record exact outputs.
- [ ] **Step 4: Inspect built/static output for accidental secret or production endpoint inclusion.**
- [ ] **Step 5: Commit** `docs: document sandbox answer viewer verification`.

### Task 8: Browser verification and final review gate

**Files:**
- Modify: `work/reviews/2026-09-25-answer-viewer-sandbox-verification.md` with observed evidence only.

**Interfaces:**
- Browser verification matrix: narrow mobile (~320px), standard phone (~390px), large phone (~430px), tablet (~768px), desktop (~1280px).

- [ ] **Step 1: Start production-like preview and visit each state/fixture route.**
- [ ] **Step 2: Verify each viewport has no document-level horizontal overflow; capture screenshots where tooling supports it.**
- [ ] **Step 3: Verify Burmese wrapping, long lists/tables, zero/one/multiple artifacts, external-link behavior, pending/expired/not-found/invalid states.**
- [ ] **Step 4: Run the full verification suite again after browser checks.** If introduced failures occur, use systematic-debugging before changing code.
- [ ] **Step 5: Use verification-before-completion and perform a security review for draft leakage, XSS, enumeration/fallback, production API access, secrets, iframe policy and artifact URLs.**
- [ ] **Step 6: Commit final evidence** `test: verify sandbox answer viewer behavior`.

### Task 9: Reviewable PR delivery

**Files:**
- No production file mutation beyond the approved branch contents.

**Interfaces:**
- PR title: `feat: add Pocket HR Partner sandbox answer viewer`.
- PR body includes architecture, files, visual evidence, tests/build, security review, Glide embed notes, untouched production systems, and Phase 2 requirements.

- [ ] **Step 1: Compare branch against `main` and confirm only intended sandbox/docs files changed.**
- [ ] **Step 2: Confirm production Supabase migration list/data were not mutated by this task and no n8n/Glide/Sheets mutation action was executed.**
- [ ] **Step 3: Create dedicated PR; do not merge.**
- [ ] **Step 4: Report branch, commits, PR, route/fixture keys, verification/security/embed results, failures/uncertainty, and exact Phase 2 scope.

## Rollback / Isolation Strategy

Phase 1 is additive. Rollback is branch/PR abandonment or removal of `apps/answer-viewer-sandbox` plus its sandbox docs before merge. No production database migration, runtime workflow mutation, Glide configuration change, Google Sheets mapping change, or production data migration is part of this plan.

## Phase 2 Boundary (not implemented here)

Phase 2 must define an authenticated/signed server-side lookup that maps an authorized viewer/request to a client-safe `HRAnswer` projection containing only approved `Final_Answer` and safe artifact metadata. It must prove row/request authorization independently of opaque key entropy, preserve the consultant HITL gate server-side, establish verified Glide iframe origins/CSP, and add audit/expiry/revocation semantics before production data is connected.