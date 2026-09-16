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
