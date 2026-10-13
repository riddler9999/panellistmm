# Pocket HR Consultation Embed — implementation evidence 2026-10-14

## Actual Google Sheet contract
Drive spreadsheet: `Panellist HR Tickets Bridge`, spreadsheet ID `1B6Mo7NU6E1erFosckf8KZv1sz2SZeSJdVwq7BhS1-qQ`.
Live `Sheet1!A1:AH1` header confirms:
`Row ID`, `Ticket_Title`, `Ticket_Status`, `Ticket_Category`, `Request_Text`, `AI_Answer`, `Consultant_Answer`, `Final_Answer`, `Review_Status`, `Owner_Email`, `Admin_Role`, `🔒 Row ID` and other existing columns.
No `Approval_Status`, `Approved_Question`, `round_id`, `revision`, or history persistence columns exist in the current bridge. Do not invent them in a production write.

## n8n contract and constraints
Active `Panellist Unified Orchestrator` (`97Hrjp3aKOLIR4wJ`) updates Sheet1 by matching `Row ID`, writes `AI_Answer` and `Ticket_Status='Awaiting Review'`.
`Guard Existing Human Review` prevents some replays, explicitly states its Sheet read/update is **not atomic**.
Active `Panellist HR Consultant Internal API` (`kZVxvax5MG7BIClj`) emits `ASK_CLARIFICATION` / `PROVIDE_ADVICE` and validates bounded clarification history, but no persistence/approval callback has been established here.
The existing n8n integration is **not** a secure User/Consultant read API. Do not expose it directly in the browser.

## Security and release
`/consultation` is a mobile/desktop-responsive React/Vite UI draft.
`/api/consultation` must return 403 until a trusted Glide identity bridge and trusted Sheet Users/role lookup are implemented and deployed. Neither URL email nor role fields prove identity.
`Owner_Email` in the Sheet alone is not evidence of row-level authorization.
No production n8n/Glide/Sheet writes or publication authorized.
Live approval/edit/reject, persisted clarification rounds, duplicate-safe delivery and isolated multi-account Glide UAT remain open.


## October 14 verified reconciliation and execution priority

Owner decision: defer remediation of the known **UI CI assertion** failure for October 14–31, 2026; continue authentication, backend contracts and approval visibility. This does not waive security tests or authorize production deployment. Keep PR #13 draft.

Direct live Google Sheets read of `Sheet1!A1:AH1` confirmed 34 columns, including `Review_Status`, `Processing_Status`, `AI_Answer`, `Sheet_AI_Answer`, `AI_Draft`, `Consultant_Answer`, `Final_Answer`, `Owner_Email`, `Admin_Role`, `Row ID`, and `🔒 Row ID`. Crucially, `Approval_Status`, `Approved_Question`, delivery acknowledgement, and clarification round/revision history columns are **not present**. Neither `Review_Status` nor `Ticket_Status` is independently verified as release/delivery proof. The backend projection therefore withholds user-visible approved answers/questions until a verified release contract exists, even if their text fields are populated.

The active Unified Orchestrator `97Hrjp3aKOLIR4wJ` uses the sheet above and matches `Row ID`; the Internal HR API `kZVxvax5MG7BIClj` validates clarification inputs. Neither by itself provides an authenticated read API or a proven publish acknowledgement contract.

`App: Logins` in the bridge spreadsheet is not independently verified as the canonical identity store; consultant/user role mapping in the approved Users source is still outstanding. Never derive role from `Sheet1.Admin_Role` or from client email. The 4-digit PIN + 30-day revocable session must remain disabled until identity binding and persistent lockout/session storage are verified, including real Glide embed behavior.

The October 14 correction commits are `8c310ce709b2a999a53c57126d482f3d0048e093` (fail-closed projection) and `fe029c868363068a7891e10dcc15935b1c9cfc7c` (focused projection test). Test execution for these commits is **not verified**; do not report PASS. Existing UI CI red status remains a tracked, explicitly deferred defect, not an accepted production release state.
