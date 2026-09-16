# TASK-002 — HR Consultant RAG Foundation

## Status
ACTIVE — reconciliation complete; one acceptance criterion still lacks direct rerun evidence

## Spec
`work/specs/SPEC-002-hr-consultant-hitl-learning.md`

## Objective
HR Consultant Agent ၏ RAG layer အတွက် knowledge schema တည်ဆောက်ပြီး၊ advice corpus ကို ingest လုပ်ကာ retrieval quality ကို evidence ဖြင့်အတည်ပြုရန်။

## In Scope
- ရှိပြီးသား `public.hr_kb` schema ကို SPEC-002 နှင့် align လုပ်ရန်
- `gemini-embedding-001` → 1536-dim embedding pipeline
- FAQ / SOP / TicketQA corpus ingestion
- Retrieval query + deterministic retrieval gate
- Burmese + English retrieval benchmark

## Out of Scope
- Review loop UI / state machine (TASK-003)
- Consultant correction-learning implementation (TASK-003)
- Discovery routing (TASK-001 — backlog)
- Production deployment / publish
- Real HR PII model approval

## Relevant Context
- `work/specs/SPEC-002-hr-consultant-hitl-learning.md`
- `work/reviews/TASK-002-retrieval-benchmark.md`
- `work/reviews/2026-09-16-hr-consultant-runtime-reconciliation.md`
- `project/CURRENT_STATE.md`
- `platforms/n8n/INVENTORY.md`

## Acceptance Criteria — reconciled 2026-09-16
- [x] Burmese retrieval benchmark recorded — R@5 = 1.00 (self-retrieval); real-question benchmark previously recorded 10/12 top-1.
- [x] English comparison recorded — Burmese ≈ 0.673 vs English ≈ 0.674 top-1 similarity; no Burmese-specific deficit found.
- [x] Embedding dimension = 1536 confirmed; `hr_kb.embedding` uses `vector(1536)` with HNSW cosine index.
- [x] Existing `hr_kb` schema gap analysis completed.
- [x] Additive migration `hr_kb_hitl_learning_loop_support` recorded as applied.
- [x] SOP source-type ingest blocker recorded as fixed via `hr_kb_allow_sop_source_type`.
- [x] Earlier Postgres credential / empty-table blocker is superseded by later runtime evidence; FAQ/SOP/TicketQA knowledge was subsequently ingested and used in retrieval tests.
- [x] Ingested data was exercised end-to-end through the hardened RAG path. Recorded executions include `62697`, `62699`, `62706`, `62695`, `62701`, `62703`, and `62704`.
- [ ] **Explicit ingest rerun dedup verification**: the schema has `(source_id, chunk_hash)` unique dedup protection, but the canonical evidence set does not yet contain a direct before/after rerun proving that a repeated ingest creates zero duplicate rows.

## 2026-09-16 Runtime State
Main workflow: `HR Consultant Agent` (`oWB6VGMxXPT0uzI7`).

Retrieval workflow: `Panellist HR KB Search — Agent Tool` (`I2BXh1yN53KcwV0z`).

Hardened deterministic path:

`Input Validation -> Session Isolation -> Retrieval -> Retrieval Quality Gate -> Clarify Extraction -> Deterministic Router -> Answer Generation -> Channel Response`

Routes: `CLARIFY`, `KB_ANSWER`, `NO_MATCH`, `RETRIEVAL_ERROR`.

Thresholds recorded at verification time:
- minimum similarity: `0.63`
- TicketQA near-top clarify delta: `0.01`

The hardened draft was intentionally not published.

## Remaining Closure Gate
TASK-002 should not be marked `COMPLETED` until one explicit idempotency/dedup verification is captured:

1. Record current row count / unique `(source_id, chunk_hash)` count for the chosen ingest sample.
2. Re-run the same ingest input without changing source content.
3. Confirm duplicate row count remains zero and unique count does not increase unexpectedly.
4. Record execution ID and counts in the runtime reconciliation review.

This is a verification task only. Do not redesign the ingestion pipeline or add another dedup layer unless the rerun proves the existing constraint is insufficient.

## TASK-003 Gate
`TASK-003` (HITL review + consultant correction-learning loop) remains the next product task, but implementation should begin only after the dedup closure evidence above is recorded.

Production HR consultation remains 100% HITL:

`User request -> grounded AI draft -> consultant review/edit/approve -> final delivery`

Direct AI-to-client publishing is not authorized by TASK-002 completion.
