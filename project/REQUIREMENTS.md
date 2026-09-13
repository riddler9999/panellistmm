# Requirements

## Functional
- Accept requests from client-facing surfaces and route them through n8n.
- Support Discovery, HR Consultant, SOP, and Org Chart workflows.
- Preserve company and user scope across requests.
- Support asynchronous processing where the client cannot wait for long-running agent work.
- Return structured status, answer/output, confidence/source metadata where applicable, and review flags.
- Generate SOP and Org Chart diagrams in `.drawio` format as the canonical diagram artifact.
- Support human review/escalation for low-confidence or policy-sensitive cases.

## Non-functional
- Deterministic validation around critical structured outputs.
- Auditability for requests, decisions, failures, retries, and approvals.
- Idempotency for externally retried requests where applicable.
- Explicit timeout/fallback behavior.
- No cross-company data leakage.
- Secrets must stay outside committed documentation and source.
- Production-impacting changes require explicit approval and verification.
