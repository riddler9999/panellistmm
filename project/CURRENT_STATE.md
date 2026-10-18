# Current State

## လက်ရှိ Phase
Phase 2 — HR Consultant Agent / RAG hardening → HITL review integration

## အခြေအနေ
Project operating baseline တည်ဆောက်ပြီးဖြစ်သည်။ Owner decision အရ Discovery routing ကို backlog တွင်ထားပြီး **HR Consultant Agent နှင့် HITL learning loop** ကို ဦးစားပေးလုပ်ဆောင်နေသည်။

Pocket HR Glide app သည် development stage ဖြစ်ပြီး export ထဲက user/company/invoice/ticket/chat records များကို usage evidence အဖြစ်မယူရ။ App configuration / integration reference အဖြစ်သာယူရမည်။

## Canonical / Runtime Source of Truth
- Canonical repo: `riddler9999/panellistmm`.
- Runtime ground truth: n8n instance + Panellist Supabase.
- 2026-09-16 reconciliation: `work/reviews/2026-09-16-hr-consultant-runtime-reconciliation.md`.

Sep-15 repo state တွင်ရှိခဲ့သော `hr_kb rows 0` နှင့် wrong-Postgres-credential blocker သည် **historical** ဖြစ်သည်။ Subsequent runtime work တွင် knowledge ingestion + retrieval + hardened RAG tests ကိုဆက်လုပ်ပြီးဖြစ်သောကြောင့် current blocker အဖြစ်မယူရ။

## Active Work
- `SPEC-002` — HR Consultant Agent + HITL learning loop.
- `TASK-002` — RAG foundation: later runtime evidence ဖြင့် core ingestion/retrieval objective ကိုဖြတ်ကျော်ထားပြီး status reconciliation လိုသည်။
- Next implementation domain — HITL consultant review / correction learning loop (`TASK-003`).

## SOP / Org Renderer — 2026-10-17
- Owner decision အရ Draw.io canonical output ကို `ADR-005` ဖြင့် supersede လုပ်ထားသည်။
- Live `Panellist Unified Orchestrator` နှင့် `Panellist Artifact Architect API` သည် SOP/Org ready contracts ကို `Panellist Excel PNG Renderer` သို့ပို့သည်။
- Renderer သည် editable XLSX နှင့် PNG snapshot နှစ်ဖိုင်လုံးအောင်မြင်မှ ready ပြန်ပေးသည်။ Draw.io generator နှင့် Org-only Excel scaffold inactive ဖြစ်သည်။ Historical Draw.io download endpoint ကို ရှိပြီးသား links အတွက်သာ ဆက်ထားသည်။

## Pocket HR consultation production — 2026-10-17
- Vercel production `https://panellistmm.vercel.app/consultation` တွင် requester name၊ consultant review/edit/approve၊ reviewed attachments၊ clarification choices/custom answer၊ User Close နှင့် 48-hour lifecycle live ဖြစ်သည်။
- User projection သည် approved delivery proof ရှိသော content ကိုသာ `Consultant` အဖြစ်ပြပြီး AI draft/source ကိုမဖော်ပြပါ။
- Supabase conversation/file migrations apply ပြီး private storage နှင့် service-role-only database access ကို verify လုပ်ထားသည်။
- Unified Orchestrator active version `87206869-29e2-49d3-946d-0cfbe25b6500` သည် clarification contract နှင့် bridge guard ပါဝင်သည်။ Async dispatcher `wBJ0zhWTsPpPtcOm` သည် new request/follow-up ကို canonical orchestrator သို့ပို့သည်။
- Final verification: 40 test files / 149 tests၊ build၊ lint၊ preview/production smoke tests PASS; recent production error/fatal logs မရှိ။

## Backlog
- `SPEC-001` / `TASK-001` — Discovery routing.
- Glide `Resources` 220 template corpus ingestion — SOP/FAQ/TicketQA advice corpus ထက် priority နိမ့်။

## Verified Infrastructure
- Supabase project `Panellist` (`apnvkmwcmfpkkifzmdfc`).
- `public.hr_kb` with `vector(1536)` and cosine retrieval support.
- Embedding model: `gemini-embedding-001`, 1536 dimensions.
- Existing migrations include HITL learning-loop support and SOP source-type support.

## Verified HR Consultant Runtime — 2026-09-16
Main workflow: `HR Consultant Agent` (`oWB6VGMxXPT0uzI7`).
Retrieval workflow: `Panellist HR KB Search — Agent Tool` (`I2BXh1yN53KcwV0z`).

Hardened draft path:

`Input Validation -> Session Isolation -> Retrieval -> Retrieval Quality Gate -> Clarify Extraction -> Deterministic Router -> Answer Generation -> Channel Response`

Deterministic routes:
- `CLARIFY`
- `KB_ANSWER`
- `NO_MATCH`
- `RETRIEVAL_ERROR`

Current tested controls:
- minimum similarity threshold `0.63`;
- TicketQA near-top clarification delta `0.01`;
- deterministic SOP provenance filtering;
- invalid-input fallback;
- no-match fallback;
- retrieval-error path preserved;
- high-risk termination/payroll/legal cases clarify-first rather than asserting unsupported rules.

Manual RAG cases recorded as PASS include generic HR grounding, TicketQA clarification, same-session follow-up, SOP provenance, non-HR no-match, blank input, and high-risk termination/final-salary handling. A deliberate live retrieval outage was not induced; that path is configuration/wiring validated.

## Publication / Production Gate
Tested hardened draft: `2394b4e9-9c67-446d-bc27-db6034a5e70a`.
Previously active version at verification: `375101dd-9ac3-4636-91a8-9e5519764f64`.

The hardened draft was intentionally **not published** during testing.

Production HR consultation remains **100% HITL**:

`User request -> RAG-grounded AI draft -> consultant review/edit/approve -> final delivery`

The direct-response test workflow must not be treated as the production interface merely because RAG tests pass.

## Remaining Gates
1. Reconcile/close `TASK-002` against the Sep-16 runtime evidence.
2. Build/continue `TASK-003` HITL consultant review + correction-learning loop.
3. Keep consultant corrections separated from approved KB knowledge; de-identify before any learning ingestion.
4. Choose/approve the production model/privacy posture before real HR PII is used.
5. Keep publish/activation owner-gated.
6. Optional but recommended before production: deliberate retrieval-dependency outage test.

## Protected Areas
- Production deployment / activation
- Production destructive database operations
- Secrets / credentials
- Real HR PII before model/privacy approval
- Approved architecture boundaries

## Last Verified
2026-09-16 — canonical repo reconciled against newer n8n/Supabase HR Consultant runtime evidence. The Sep-15 credential/zero-row blocker is stale; hardened deterministic RAG has passed the recorded manual matrix, but production publication remains blocked by the 100% HITL architecture and owner approval gates.

## Phase 2 Secure Answer Viewer update — 2026-09-25

Phase 1 sandbox viewer is merged and verified. Phase 2 secure delivery work is on isolated branch `feat/secure-answer-viewer-production-integration` and PR #8, unmerged.

Implemented in review branch:
- explicit approved-only server projection;
- HMAC-signed expiring viewer access;
- current-state revalidation and cross-ticket isolation;
- token transport via URL fragment + Authorization header to avoid raw token request-path logging;
- private/no-store response contract;
- server-side HTTPS artifact projection;
- production ticket repository/transport boundary;
- additive n8n/Glide integration contracts and rollback plan.

Read-only live n8n inspection found material drift from older docs:
- poller `I01u0vd30Db7xSfx` is inactive;
- live draft field is `AI_Answer`;
- review state is `Awaiting Review`;
- terminal guard uses `Delivered` / `Failed`.

Because of that drift, Phase 2 is **not production-ready** until the n8n + Sheet + Glide field/status contract is reconciled and actual Glide Web Embed UAT is completed. No production n8n, Google Sheet, Glide, Supabase, or ticket data mutation was made by the Phase 2 implementation work.


## October 13, 2026 — current consultation decision baseline (supersedes older consultation operating instructions above)
**Requirements approved; end-to-end implementation NOT VERIFIED / NOT READY.** Read `project/POCKET_HR_CONTEXT_2026-10-13.md` and `project/REQUIREMENTS.md` before acting on the September 16 single-pass draft path or September 25 viewer/poller observations. Those sections remain historical evidence only.

Current approved consultation: AI chooses `ASK_CLARIFICATION` or `PROVIDE_ADVICE`; **both** go to consultant approve/edit/reject. Only approved questions/advice reach users. User answers trigger contextual reassessment, including repeated rounds. Final advice requires approval. Resolved tickets are read-only and follow-up consultation requires a new ticket. Consultants may view all tickets; users only their own. Category assignment is not an access filter.

Glide screenshot-confirmed configuration only: `Tickets.Sheet_AI_Relation` matches `Tickets.🔒 Row ID` to `Sheet1.Row ID` with Match Multiple off; `Tickets.Ticket_Assigned` looks up `Ticket_Category_R → Helpdesk_Group`. Integrity, Row Owners, backend authorization, approval-to-delivery and multi-round E2E remain unverified. `AI_Answer` / `Sheet_AI_Answer`, `Awaiting Review` / `Pending Review`, `Delivered` / `Resolved` are historical or unresolved mappings, **not** permission to rename live fields or states.

Codex A branch `fix/consultation-assessment-review-guards`, local commit `6849c34` and 43/43 tests are **reported handoff claims only**; publication, GitHub availability and real integration are unverified. Required next gates: inspect actual Glide/n8n field and status contract; verify user/consultant data-level access; implement or verify clarification submission and persistent multi-round reassessment; verify revision-safe approvals, reject/edit, idempotent delivery and failure recovery; complete isolated-account E2E UAT. Do not publish or modify production from this documentation update.
