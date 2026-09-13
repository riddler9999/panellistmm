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
