# Agent Operating Rules

This repository uses a plan-first, evidence-first workflow.

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
