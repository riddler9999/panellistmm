# Agent Rules

## Scope and architecture
- Never silently change approved scope or architecture.
- Prefer deletion/consolidation over introducing duplicate abstractions.
- Follow existing project conventions unless an approved decision changes them.

## Evidence
- Repository state, executable source, tests, and verified external state outrank summaries.
- Do not claim a command, test, deployment, or mutation happened unless it was actually executed.

## Context economy
- Read the smallest relevant set of files.
- Use pointers instead of duplicating large documents.
- Do not read all learnings/history unless the task references them.

## Safety
- Never commit secrets.
- Avoid destructive Git/database operations without explicit approval.
- Preserve unrelated work.

## Learning
- Record only observed failures.
- Verify root cause before recording a lesson.
- Prefer regression tests or enforceable checks over adding more prose rules.
