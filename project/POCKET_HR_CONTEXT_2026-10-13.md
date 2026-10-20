# Pocket HR — October 13, 2026 Context and Decision Baseline

> Status: **NOT READY**. This is a documentation handoff, not proof of deployed functionality. Supersedes older consultation-flow assumptions where explicitly marked. Existing repo architecture and runtime evidence remain separate sources of truth.

## 1. Scope and systems

- Product: Panellist Pocket HR, AI-assisted HR consultation platform.
- Glide app: `V2 Sandbox of Pocket HR`; user, consultant and admin interface.
- Google Sheets: processing bridge; `Tickets` is proposed primary request record, `Sheet1` AI processing bridge.
- n8n: AI assessment, reassessment and orchestration.
- HR knowledge base: retrieval/grounding; existing Supabase infrastructure.
- Repository: `riddler9999/panellistmm`.
- Preserve SOP/Org Chart capabilities and their existing contracts; this update concerns consultation only.

## 2. Owner-confirmed consultation behavior (requirements, NOT runtime verification)

1. User submits an HR request.
2. AI assesses available information and chooses **ASK_CLARIFICATION** (information insufficient) or **PROVIDE_ADVICE** (information sufficient).
3. Both AI-generated questions and advice are **consultant-only drafts** until reviewed.
4. Consultant can approve, edit or ask clarification. Only approved content can reach the user. Unapproved content must not be delivered.
5. If clarification is approved, user receives questions and submits answers.
6. AI reassesses with the accumulated conversation context, and can ask another round or propose advice. Clarification may repeat without a fixed number of rounds.
7. Final advice requires consultant approval before user delivery.
8. Resolved tickets become read-only. Additional consultation requires a new request.

**Access policy confirmed by owner:** consultants can view **all tickets**, not just assigned tickets. Normal users must not view other users' tickets. Admin permissions need explicit detail. Owner reports that normal users already cannot see others' tickets; this is **user-confirmed behavior**, not independently verified row-level enforcement. Company-isolation and Row Owner configuration remain unverified. Category-based assignment must not be mistaken for authorization.

## 3. Glide evidence reviewed in chat (October 13 screenshots)

- `Tickets.Sheet_AI_Relation`: Relation from `Tickets.🔒 Row ID` to `Sheet1.Row ID`; **Match Multiple disabled**. Configuration VERIFIED from panel screenshots, but full row integrity not verified.
- `Tickets.Ticket_Assigned`: lookup `Ticket_Category_R → Helpdesk_Group`; configuration verified, assignment completeness and permissions unverified.
- `Sheet1.Owner_Email`: email-typed column verified; **not evidence** that Row Owner is enabled.
- `Sheet1.Admin_Role`: `Admin` values observed; enforcement unverified.
- `Users.Role`: `Admin`, `User`, `Assistant` values observed; consultant-role mapping and authorization unverified.
- `Users.Company Name` exists; company isolation is **not established** by a column alone.
- Row Owner settings for `Users`, `Tickets`, `Sheet1`, `Ticket_Comments`, `Ticket_Remark` were not conclusively inspected.
- User-facing visibility of draft answers and approved-only delivery remains unverified.

Do not infer security from visibility conditions, email column types, relations or lookup fields. Verify actual data access with isolated test identities before production.

## 4. Historical CSV comparison (reported, NOT recalculated here)

| Metric | Previously reported |
|---|---:|
| Tickets rows | 73 |
| Sheet1 rows | 59 |
| Matched Row IDs | 50 |
| Sheet1-only | 9 |
| Tickets-only | 23 |
| Matching titles among matches | 50/50 |
| Matching statuses among matches | 8/50 |
| Sheet1 AI answer present / Tickets absent | 41 |
| Sheet1 final answer present / Tickets absent | 20 |
| Tickets final answer present / Sheet1 absent | 1 |

Key: `Tickets.🔒 Row ID ↔ Sheet1.Row ID`. Status differences are **not automatically corruption**: compare field meanings and state transitions before modifying records.

## 5. n8n Codex A handoff (reported, not independently re-run)

- Workflows: Panellist Unified Orchestrator `97Hrjp3aKOLIR4wJ`; HR Consultant Internal API `kZVxvax5MG7BIClj`; Artifact Architect API `tyGUPkBhNvx3C4wv`.
- Local branch: `fix/consultation-assessment-review-guards`; local commit `6849c34` (not pushed or published at handoff).
- Report: `2026-10-13-consultation-verification.md` (referenced by user; contents not independently retrieved here).
- Reported local automated tests: **43/43 PASS**, including ASK_CLARIFICATION, PROVIDE_ADVICE, model failure, duplicate Row ID, edit/approved-row guards and synthetic multi-round reassessment.
- Real Glide integration, persistent consultant approval, real clarification-answer intake, real multi-round persistence, and final delivery **not end-to-end verified**.
- Do not mistake local test success for production readiness.
- Earlier docs refer to older workflow IDs, status fields and poller architecture. Treat those as historical until reconciled against current runtime. In particular, `AI_Answer` vs `Sheet_AI_Answer`, `Awaiting Review` vs `Pending_Review`, and `Delivered` vs `Resolved` require a single explicit contract.

## 6. Integration invariants and open contract decisions

- Drafts and internal notes must not be included in user-accessible data projections before approval.
- Approval must identify the exact assessment revision/clarification round being approved, preventing stale approval of later drafts.
- Track approval and delivery as separate states; successful approval does not prove successful delivery.
- User clarification answer must attach to the correct ticket and round; reprocessing must be idempotent.
- Persist multi-round question, answer, AI assessment and consultant decision history without overwriting previous rounds.
- Delivery must be idempotent and guarded against duplicate writes/retries.
- Edit/clarification semantics, actual field names, state machine, authenticated n8n callback, role mapping, error recovery and delivery acknowledgement are **open**, not already implemented by this document.
- Preserve the existing 100% human-in-the-loop requirement and resolved read-only behavior.

## 7. Work split and implementation order

**Codex A / n8n:** assessment, reassessment, routing, workflow guards; do not overlap Glide UI work.

**Glide agent / Glide-side implementer:** inspect existing consultant review screens, action configuration, fields, clarification submission and user-facing projections; reuse existing capabilities before adding new columns/actions. Do not modify n8n.

**Sequence:**
1. Focused read-only inspection of existing consultant review UI/actions and exact Sheet/Glide field mapping.
2. Reconcile a single integration contract with n8n Codex A, including decision types, round IDs, approval revisions, statuses and delivery.
3. Implement only missing Glide-side pieces and corresponding n8n handoff points in their respective ownership areas.
4. Test normal-user vs consultant data access (including underlying data, not just hidden UI), approved-only content, edit/clarification, repeated clarification, failures, retries and duplicate delivery.
5. End-to-end UAT using isolated test tickets and accounts; only then consider publish, merge or deployment.

## 8. Release gate / do not assume

**NOT READY**. No production publish, deploy or merge is authorized by this context update. No production data or security configuration should be changed solely based on unverified screenshot inference.

This document is a **dated handoff supplement** to `project/CURRENT_STATE.md`, `delivery/01-System-Architecture.md` and earlier reviews. Those older documents contain historical runtime observations; conflicting details must be reconciled, not silently overwritten.
