# HR Consultant Runtime Reconciliation — 2026-09-16

## Purpose
This record reconciles the canonical `riddler9999/panellistmm` repository with the newer 2026-09-16 n8n/Supabase work that had been documented outside this canonical repository.

## Source-of-truth rule
- Canonical project repository: `riddler9999/panellistmm`.
- Runtime ground truth: n8n instance + Panellist Supabase project.
- Older repository status must not override newer execution/test evidence.

## Verified newer runtime state
Main workflow: `HR Consultant Agent` (`oWB6VGMxXPT0uzI7`).
Retrieval workflow: `Panellist HR KB Search — Agent Tool` (`I2BXh1yN53KcwV0z`).

The hardened draft now performs deterministic upstream RAG:

`Input Validation -> Session Isolation -> Retrieval -> Retrieval Quality Gate -> Clarify Extraction -> Deterministic Router -> Answer Generation -> Channel Response`

Routes: `CLARIFY`, `KB_ANSWER`, `NO_MATCH`, `RETRIEVAL_ERROR`.

Configured retrieval threshold: `0.63`.
Calibrated TicketQA near-top clarify delta: `0.01`.

Provenance hardening is deterministic: non-SOP evidence is preferred when present; SOP-only evidence is explicitly treated as template/reference material rather than confirmed company policy or law.

## KB / RAG progress superseding the Sep-15 blocker
The Sep-15 repository state said the Postgres credential/ingestion path was blocked and `hr_kb` had zero rows. Subsequent runtime work moved past that state. FAQ, SOP and TicketQA knowledge were ingested and retrieval was exercised end-to-end. The old credential/zero-row statement must therefore be treated as historical, not a current blocker.

## Manual RAG validation evidence
Recorded successful cases from the hardened draft include:
- `62697` generic employee turnover -> `KB_ANSWER` PASS.
- `62699` probation attrition -> `CLARIFY` PASS.
- `62706` same-session follow-up -> `KB_ANSWER`, no clarification loop -> PASS.
- `62695` performance-review provenance -> SOP excluded where non-SOP evidence existed -> PASS.
- `62701` non-HR question -> `NO_MATCH` PASS.
- `62703` blank input -> validation fallback PASS.
- `62704` termination/final-salary high-risk case -> clarify-first, no unsupported legal/final-salary rule -> PASS.

Retrieval failure handling is wired/config-validated, but a deliberate live dependency outage was not induced.

## Publication state
Tested hardened draft version: `2394b4e9-9c67-446d-bc27-db6034a5e70a`.
Previously active version at verification time: `375101dd-9ac3-4636-91a8-9e5519764f64`.
The hardened draft was intentionally not published during the test cycle.

## Architecture constraint still in force
Production HR consultation remains 100% HITL:

`User request -> grounded AI draft -> consultant review/edit/approve -> final delivery`

Passing direct-response RAG tests does not authorize a direct AI-to-client production path.

## Reconciled task interpretation
`TASK-002` RAG foundation is no longer blocked by the Sep-15 credential/empty-table state. Its core ingestion/retrieval objective has been demonstrated by the later runtime work. Remaining work belongs primarily to production HITL integration/review-loop work, production model/PII approval, publication gates, and optional fault-injection verification.

## Next
1. Reconcile `TASK-002` status against this evidence and close it if no acceptance criterion remains unmet.
2. Open/continue `TASK-003` for the HITL review and correction-learning loop.
3. Do not publish the direct-response hardened workflow as the production interface.
4. Keep real HR PII behind the production-model/privacy approval gate.
