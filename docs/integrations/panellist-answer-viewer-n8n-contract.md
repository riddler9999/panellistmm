# Panellist Answer Viewer — n8n Integration Contract

## Live inspection — 2026-09-25

Read-only inspection of workflow `Process pending Glide Panellist requests` (`I01u0vd30Db7xSfx`) found:

- workflow is currently **inactive**;
- source is Google Sheet `Panellist HR Tickets Bridge`, sheet `Sheet1`;
- canonical ticket identity in the live flow is `Row ID`;
- current draft write node writes `AI_Answer`, not `Sheet_AI_Answer`;
- current draft status is `Awaiting Review`;
- terminal guards include `Delivered` and `Failed`;
- artifact write fields are `Artifact_Title`, `Artifact_URL`, `Artifact_Status`;
- legacy artifact fields `Artifact_Download_URL` / `Artifact_Editor_URL` are still read for replay protection.

This is material drift from older repository documentation. Do not publish a Phase 2 production change until the field/status contract is reconciled and regression-tested.

## Responsibilities

n8n remains orchestration / AI workflow. It does not generate viewer HTML and must not place AI draft content in a client viewer URL.

After consultant approval/edit has committed the approved answer and the approved terminal state, the integration may obtain a complete signed viewer URL from a trusted server-side link-generation path and write it to `Answer_Viewer_URL`.

Requirements:

- never generate the viewer URL at AI-draft stage;
- never put `AI_Answer`, `Sheet_AI_Answer`, `Consultant_Answer`, `Final_Answer`, prompts, or PII inside the URL;
- repeated processing must reuse an existing valid `Answer_Viewer_URL` when present rather than creating uncontrolled link churn;
- link generation must be additive and must not change consultant Approve/Edit semantics;
- no production workflow update/publish is included in the Phase 2 PR.

## Reconciliation gate

Before rollout, decide and verify one canonical contract across n8n + Sheet + Glide:

- draft field: live currently `AI_Answer`; older docs say `Sheet_AI_Answer`;
- review state: live currently `Awaiting Review`;
- client-visible approved terminal state: live evidence indicates `Delivered`; older docs say `Resolved`.

The Answer Viewer server defaults to `Delivered` because that is the current live workflow evidence. Changing this value requires tests and a coordinated contract update.
