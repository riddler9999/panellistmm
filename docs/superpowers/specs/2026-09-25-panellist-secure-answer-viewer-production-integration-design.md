# Pocket HR Partner Secure Answer Viewer — Phase 2 Design

## Intent

Phase 1 sandbox viewer ကို production-safe presentation layer အဖြစ် promote လုပ်ပြီး current Panellist consultant HITL boundary ကို မပြောင်းဘဲ approved HR answers ကို Glide Web Embed ထဲ secure delivery လုပ်ရန်။

## Current-state findings

- Phase 1 PR #7 is merged to `main`; latest sandbox verification workflow passed, including tests, typecheck, lint, production build and Chromium verification.
- Phase 1 public contract excludes `Sheet_AI_Answer` and raw AI draft; render gate is resolved + non-empty `finalAnswer`.
- Current production delivery path is Glide/Google Sheet backed: n8n writes `Sheet_AI_Answer`; consultant actions write `Final_Answer` and `Ticket_Status`.
- Repository delivery docs contain drift: some diagrams describe Supabase as ticket/state storage, while runtime/HITL evidence shows Google Sheet + Glide is the authoritative delivery path. Phase 2 must correct that documentation drift.
- Current canonical status contract in runtime evidence is `Submitted → Pending_Review → Resolved`. The production viewer shall treat only `Resolved` as client-visible.
- Existing artifact runtime fields are not reliably documented in the repo. Artifact adapter code must use an explicit mapping boundary and keep production field names configurable until runtime field names are verified.

## Architecture decision

### Selected source of truth

Use the existing Google Sheet / Glide ticket row as the production Answer Viewer source of truth for ticket identity, `Ticket_Status`, `Final_Answer`, consultant review metadata, and client-visible artifact metadata.

Why:
- it is where current HITL approval commits `Final_Answer` and `Ticket_Status`;
- it avoids duplicate persistence and new migrations;
- it preserves current consultant actions and rollback;
- it lets the viewer re-check current business state on every request.

Supabase remains the RAG/knowledge store and is not introduced as a new ticket read model in this phase.

### Secure access model

Use HMAC-signed opaque viewer tokens generated server-side after approval.

Token claims:
- version
- ticketId
- issuedAt
- expiresAt
- random nonce

The token contains no answer body, artifact URL, user PII, AI draft, or consultant draft.

Validation order:
1. parse token shape;
2. verify HMAC signature with server-only secret;
3. enforce expiry;
4. load ticket by exact ticketId from the authoritative adapter;
5. require current `Ticket_Status === "Resolved"`;
6. require current non-empty `Final_Answer`;
7. project an allowlisted client contract;
8. return with `Cache-Control: private, no-store`.

A valid stale token never bypasses current ticket state. If a resolved ticket is reopened, its old URL stops exposing the answer immediately because the server re-reads current status.

### Link lifecycle

- Viewer link is created only after consultant approval/edit has committed `Final_Answer` and `Resolved`.
- Link generation is deterministic/idempotent for a ticket while the underlying signing policy/version is unchanged.
- Expiration is enforced by signed token timestamps.
- Reopening/non-resolved status revokes visibility independent of token expiry.
- Answer/artifact edits do not require a new URL because server state is resolved at request time.
- Secret rotation invalidates previously signed links; rollout must keep prior key support only if an explicit overlap window is required.

### Server-side projection

Production response type:

```ts
type ClientVisibleHRAnswer = {
  answerKey: string;
  ticketId: string;
  title: string;
  status: "resolved";
  finalAnswer: string;
  artifacts: Array<{
    type: "sop" | "org_chart" | "form" | "file";
    title: string;
    url: string;
  }>;
  reviewedBy?: string;
  reviewedAt?: string;
  updatedAt: string;
};
```

The adapter may fetch a full trusted row internally, but the browser/API response is built through an explicit mapper. Forbidden fields include `Sheet_AI_Answer`, `Consultant_Answer`, prompts, model metadata, routing metadata, n8n execution data, secrets and unrelated ticket/user data.

### Viewer/runtime split

- n8n = orchestration / AI workflow
- Google Sheet + Glide ticket row = authoritative delivery state
- Answer Viewer server = authorization + current-state validation + projection
- Answer Viewer client = safe presentation
- Glide = portal / request workflow / embed host

n8n does not render HTML.

## API and route shape

- `POST /api/answer-viewer/link` is a trusted-server helper used by approved integration code to create a signed URL from a ticket ID. It is not a public browser endpoint without authentication.
- `GET /api/answer-viewer/:token` validates access and returns only the projected safe contract.
- `/answer/:token` loads the client viewer and fetches the narrow API response.

Implementation must keep the data adapter behind an interface so tests can use fixtures while production uses server-side credentials.

## Authorization and failure behavior

External client-facing failures intentionally do not distinguish invalid token, unknown ticket, cross-ticket mismatch, or unauthorized ticket existence. They return the same safe access-denied/unavailable class.

Internal observability may classify:
- viewer_access_success
- viewer_access_denied
- viewer_token_invalid
- viewer_ticket_not_resolved
- viewer_ticket_not_found
- viewer_render_failure

Logs must not include raw tokens, `Final_Answer`, AI drafts, consultant drafts, or unnecessary user fields.

## Artifact mapping

Reuse current production artifact system. No new artifact persistence.

The adapter normalizes verified production artifact fields into:
- `sop`
- `org_chart`
- `form`
- `file`

HTTPS-only action policy from Phase 1 remains. Missing/malformed URLs become non-actionable viewer items or are omitted according to explicit mapper rules.

Because repo documentation does not yet prove the current runtime artifact column names, production field names must be verified against live integration before any production Sheet mapping change is applied.

## Glide integration

Add/reuse one canonical field: `Answer_Viewer_URL`.

Glide does not construct tokens.

Visibility:
- `Ticket_Status = Resolved` and non-empty `Answer_Viewer_URL` → viewer embed may show.
- all other states → viewer embed hidden.

Existing `Final_Answer` presentation remains available during rollout as fallback. Consultant controls remain unchanged.

## Security and privacy

- Preserve Phase 1 Markdown/XSS controls.
- Protected API responses: `Cache-Control: private, no-store, max-age=0`; `Pragma: no-cache`.
- Do not statically generate protected answers.
- Do not log answer bodies or tokens.
- Narrow `frame-ancestors` only after actual Glide embed origin is verified.
- Secrets are server-only environment variables; never committed.

## Rollout

1. code + tests on isolated branch
2. preview deployment
3. safe test-ticket integration
4. browser verification
5. isolated Glide embed verification
6. consultant/admin UAT
7. normal-user UAT
8. explicit production rollout decision

No production-wide cutover in this PR.

## Rollback

- stop populating/using `Answer_Viewer_URL`;
- hide/disable viewer embed;
- continue existing `Final_Answer` presentation;
- leave all tickets and consultant answers unchanged;
- revert viewer deployment/code if needed;
- no data migration rollback required.

## Non-goals

- no AI-agent redesign;
- no new Supabase ticket table;
- no destructive migration;
- no replacement of HITL;
- no direct client access to `Sheet_AI_Answer`;
- no removal of existing Glide fallback during this phase.
