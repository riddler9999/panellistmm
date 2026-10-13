# Pocket HR — Glide Web Embed Implementation Plan

Status: **PLAN ONLY — NOT IMPLEMENTED**  
Decision baseline: 2026-10-13/14  
Method: Superpowers-style Plan → Implement → Test → Review; Ponytail minimal changes.

## Approved product behavior
- Glide: existing login and navigation, with an embedded existing React/Vite web app.
- Google Sheets: consultation business records and history; reuse existing n8n for AI assessment, clarification, reassessment, approval/delivery integration.
- Do not connect Glide Data Relations/Lookups to the new web app backend.
- Avoid additional PIN and login prompts, **without weakening security**. Do not claim login-free identity transfer works before verification.
- `Users.Role = Admin`: all seven admins are authorized consultants; can view all tickets and review/approve/edit/reject.
- `Users.Role = User`: each user sees **only their own tickets and history**. User A must never access User B data in UI **or API**.
- `Assistant`, unknown identity/role, missing valid email: deny access.
- AI chooses `ASK_CLARIFICATION` or `PROVIDE_ADVICE`. Both remain consultant-only drafts until approved. Approved clarification responses can trigger repeated reassessment without a fixed round limit. Final advice is delivered only after approval.
- Resolved tickets read-only. New issue requires a new request.

## Implementation tasks and acceptance gates

### 1. Existing-system verification (read-only)
Inspect current React/Vite app, Glide embed configuration, Sheet field names, active/published n8n flows and repository contracts. Record actual evidence and reuse existing capabilities. **Do not edit production.**

**Gate:** exact field/status/identity contract documented; discrepancies listed, notably `AI_Answer` vs `Sheet_AI_Answer`, `Awaiting Review` vs `Pending_Review`, and `Delivered` vs `Resolved`.

### 2. Glide embed proof of concept
Use existing embed component to render the existing web app on mobile and desktop. Verify that the URL source can be produced as required. `User Profile → Email` being selectable as source does **not** prove URL composition or authentication.

**Gate:** real embed loads correctly; any cross-origin/cookie/storage limitations recorded.

### 3. Identity handoff — security blocker
Determine whether a supported, verifiable identity/session mechanism can bridge Glide login to the web backend without second login. Test with two separate accounts. Never authorize based solely on editable URL query email, role, Glide visibility conditions, or unverified embed parameters. If no secure, PIN-free handoff exists, **stop and report options**; do not silently downgrade security.

**Gate:** backend independently verifies principal, or implementation is blocked.

### 4. Authorization and data projection
At the API boundary resolve verified principal to server-side role and owner identity. Admin accesses all tickets; User receives only matching owner tickets. Default deny for Assistant/unknown. Apply same checks to ticket details, history, artifacts, clarification submit and approval mutations. Never expose unapproved drafts in user projections.

**Gate:** cross-user API tests fail closed even with modified URLs/IDs; role boundaries verified.

### 5. Consultant dashboard
Reuse React/Vite UI for all-ticket listing and approved consultant actions. Protect approval by revision/round checks. Preserve immutable history and separate approval from delivery outcomes.

**Gate:** valid approve/edit/reject; stale and duplicate actions safely rejected or idempotent.

### 6. User dashboard
Show only own ticket, approved questions/advice and history; support submitting answers for the matching ticket and round. Resolved remains read-only.

**Gate:** User A cannot read User B data; no unapproved AI draft leaks.

### 7. Google Sheets and n8n integration
Keep existing workflows. Reconcile field names and statuses rather than rebuilding automation. Coordinate writes at a single backend/workflow boundary to prevent concurrent approvals and duplicate delivery. Persist round history; define retry/failure recovery.

**Gate:** exact state transitions and no duplicate approval/delivery in tests.

### 8. Security and end-to-end tests
Use isolated test users (two normal users, one Admin, one denied role). Test API tampering, detail/history leakage, consultant actions, clarification loop, stale revision, retries, and delivery.

**Gate:** all critical tests pass with observable evidence, not just local unit tests.

### 9. Glide UAT and release
Verify mobile/desktop embedded behavior, load state, logout/session expiry, navigation and access denial. Deploy only after owner approval and rollback plan.

**Gate:** demonstrated E2E acceptance; production activation separately authorized.

## Boundaries
- No new database, custom authentication framework, new PIN, speculative layers or full workflow rewrite without demonstrated need.
- Google Sheets lacks transactional guarantees: address concurrent writes before production; storage choice does not remove the requirement.
- Do not conflate Glide Row Owners with authorization for a separate web/API backend.
- Preserve existing Supabase HR knowledge-base system; “Sheets-first” applies to consultation business records, not to removing working RAG infrastructure.
- This plan supersedes *older consultation UI/integration assumptions* where they conflict; retain earlier documents as historical evidence until separately reconciled.
- No production changes or deployment authorized by this planning document.
