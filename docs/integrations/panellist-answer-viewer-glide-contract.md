# Panellist Answer Viewer — Glide Contract

## Additive field

Use one dedicated client-visible field:

`Answer_Viewer_URL`

Do not overload `Artifact_URL`, `Artifact_Editor_URL`, or other artifact fields.

Glide must receive a complete signed URL. Glide must not construct, decode, or sign authorization tokens.

## Visibility

Show the Web Embed only when:

1. the ticket is in the reconciled approved client-visible terminal state; and
2. `Answer_Viewer_URL` is non-empty.

The current live n8n contract indicates `Delivered` is terminal. Older docs use `Resolved`; this drift must be reconciled before production rollout.

Pending / awaiting-review / failed / reopened tickets must not show the approved-answer viewer.

## HITL boundary

Consultant controls remain unchanged in this phase. AI drafts and consultant working text must not be bound to a normal-user screen or synced to normal-user devices where Glide security controls can prevent it.

The viewer URL becomes available only after approved `Final_Answer` and terminal state are committed.

## Rollout and fallback

The existing approved `Final_Answer` presentation remains available during rollout. The custom viewer is additive until isolated embed verification and user/admin UAT pass.

Rollback:

1. hide/disable the Web Embed;
2. stop populating/using `Answer_Viewer_URL`;
3. continue the existing approved `Final_Answer` presentation;
4. do not alter ticket history or consultant answers.

## UAT gate

Actual Glide Web Embed verification is required before production-ready status:

- signed URL loads in iframe;
- no frame blocking;
- responsive width and scrolling;
- Burmese typography;
- artifacts open intentionally;
- pending/awaiting-review tickets expose no answer;
- delivered approved ticket exposes only `Final_Answer`;
- normal-user payload contains no draft fields.
