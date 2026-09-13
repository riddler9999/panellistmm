# Architecture

## System flow
Client surface → API/Webhook → n8n orchestration → Discovery routing → specialized agent → validation/review → persistence/output.

## Primary components
- Client surfaces: Glide/web/admin as applicable
- Orchestration: n8n
- Data/state: Supabase Postgres
- Retrieval: Supabase pgvector when RAG is required
- Models: configured per workflow; model choice is not an architectural invariant
- Human review: required for defined low-confidence or sensitive paths
- Diagram outputs: `.drawio` for SOP and Org Chart

## Boundaries
- Production agents do not silently change project scope or architecture.
- n8n orchestrates; durable project/data state belongs in Supabase where persistence is required.
- Platform operational knowledge lives under `platforms/`; executable source stays in its native source directories.
- Architecture decisions are recorded under `.ai-architect/decisions/` when material.
