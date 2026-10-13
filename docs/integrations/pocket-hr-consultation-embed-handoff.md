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
