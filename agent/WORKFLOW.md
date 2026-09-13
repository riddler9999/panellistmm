# Agent Workflow

1. Read `project/CURRENT_STATE.md`.
2. Read the active ticket/spec.
3. Check alignment with `project/PLAN.md`, `project/SCOPE.md`, and relevant requirements.
4. Load only relevant context via `agent/CONTEXT.md`.
5. Inspect actual repository state before making assumptions.
6. Propose/implement the smallest coherent change allowed by the approved task.
7. Run appropriate tests/checks.
8. Review against acceptance criteria and architecture constraints.
9. If a failure occurs, establish evidence and root cause before fixing.
10. Re-run verification after fixes.
11. Update project state and learning records only with verified facts.

## Stop conditions
Stop and request human approval before:
- material scope changes
- architecture changes
- production deployment
- production database migrations/destructive data operations
- destructive Git operations
- secret/security policy changes
- external communications or paid-service commitments

## Completion
A task is complete only when its acceptance criteria are satisfied and verification evidence exists.
