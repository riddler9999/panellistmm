# Context Router

Load only what the current task needs.

## Always
- `project/CURRENT_STATE.md`
- active ticket under `work/tickets/active/`

## Architecture changes
- `project/ARCHITECTURE.md`
- `.ai-architect/architecture-contract.yaml`
- relevant ADRs

## Frontend / Vercel
- `platforms/vercel/`
- relevant files under `apps/`

## Database / Supabase
- `platforms/supabase/`
- relevant files under `supabase/`

## n8n automation
- `platforms/n8n/`
- relevant files under `workflows/`

## AI agent behavior
- relevant files under `agents/`
- relevant knowledge only
- relevant workflow only

Do not load all historical learnings, ADRs, platform docs, or knowledge by default.

## Pocket HR consultation routing
For consultation, HITL, ticket permissions, clarification or delivery, load `project/POCKET_HR_CONTEXT_2026-10-13.md`, `project/REQUIREMENTS.md`, and `project/CURRENT_STATE.md` first. Consult `work/specs/SPEC-002-hr-consultant-hitl-learning.md` only as historical design background where it conflicts. Read Glide/n8n integration contracts as proposed or dated evidence until live mappings are verified. Do not treat category assignment as an authorization boundary.
