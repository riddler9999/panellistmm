# Agent Operating Rules

This repository uses a plan-first, evidence-first workflow.

## Language
- Repository documentation written or updated by Claude Code, Codex, or other coding agents must be written in **Myanmar (Burmese)** by default.
- Use clear, natural Burmese suitable for technical work.
- Keep code, identifiers, file paths, commands, API names, database/table/column names, JSON keys, environment-variable names, product names, and technical terms in English when translating them would reduce precision.
- Existing English source code and machine-readable configuration do not need to be translated.
- If the owner explicitly requests another language for a specific artifact, that request overrides this default for that artifact only.

## Start here
1. Read `project/CURRENT_STATE.md`.
2. Read the active ticket under `work/tickets/active/`.
3. Confirm alignment with `project/PLAN.md` and `project/SCOPE.md`.
4. Load only the context required by `agent/CONTEXT.md`.

## Hard invariants
- Do not change scope or architecture without explicit human approval.
- Do not claim completion without verification evidence.
- Repository reality outranks saved summaries.
- Do not store secrets in documentation.
- Prefer the smallest coherent change; avoid unrelated refactors.
- Record verified failures and their prevention in `learnings/`.

## Context routing
- Vercel work → `platforms/vercel/`
- Supabase work → `platforms/supabase/` and `supabase/`
- n8n work → `platforms/n8n/` and `workflows/`
- Architecture changes → `project/ARCHITECTURE.md` and `.ai-architect/`

## Execution
Follow `agent/WORKFLOW.md` and `agent/RULES.md`.

## Pocket HR consultation — mandatory current baseline (2026-10-13)
For any consultation, HITL, Glide ticket, n8n consultation or delivery change, read `project/POCKET_HR_CONTEXT_2026-10-13.md` and `project/REQUIREMENTS.md` before historical specs, tickets, plans or delivery guides. October 13 owner-approved behavior overrides conflicting earlier single-pass consultation instructions. `project/CURRENT_STATE.md` tracks evidence and unresolved gates; neither a document nor a local handoff proves deployed behavior. `work/specs/SPEC-002-hr-consultant-hitl-learning.md` contains historical proposals, not approved live schema or statuses. Do not infer field mappings or production readiness. Never expose unapproved drafts; consultants see all tickets and users only their own, subject to verified backend/Row Owner enforcement. No production changes without explicit authorization.
