# Pocket HR — React Integration Boundary (October 14, 2026)

## Approved UX
- Glide owns native sign-in and the embedded navigation shell.
- The existing Vercel React dashboard remains the Consultant/User interface.
- No Glide-native replacement, PIN, OTP, or magic-link login.
- Google Sheets is the ticket source; n8n handles consultant workflow and delivery.

## Security boundary (non-negotiable)
Glide visibility, Row Owners, Web Embed URL fields, email, and Row ID do not authenticate a request to the Vercel backend. Never authorize data access or writes using them alone. The current consultation GET and approval POST endpoints must remain 403 until the backend can independently verify the caller's identity and role. A screenshot of an authenticated Glide screen is not proof of backend authorization.

## Implementation sequence
1. Keep React list/detail and Consultant Action drafting UI available as clearly labeled sample-only preview. No private records in sample bundles.
2. Keep canonical Sheet1 headers and exact Ticket_Status strings. Do not derive published state from Ticket_Status, Review_Status, or Final_Answer alone.
3. After an independently verified identity integration is established, resolve role from a trusted registry, authorize the ticket set, and only then fetch and project data. User role may access only matching Owner_Email; Consultant/Admin may access all authorized tickets.
4. Batch approval and delivery proof reads for the already-authorized ticket IDs; avoid N+1 queries. Ensure latest revision is chosen deterministically and a missing/mismatched proof fails closed.
5. Implement approve, edit, and request clarification through a single revision-checked server-side contract. Persist immutable approved snapshots, retry failed delivery idempotently, and publish only after durable delivery acknowledgement.
6. Test both roles with actual Sheet schema fixtures, cross-user direct-ID denial, spoofed URL/email, absent proof, duplicate approvals, failed delivery, and n8n retry. Perform read-only verification before any production write.

## Current limits
The action buttons are preview-only and submission is disabled. The batched proof reader exists but is not wired to a live authorized endpoint. Tests are deterministic fixtures, not a live multi-user end-to-end validation. Do not claim deployment, successful CI, identity verification, or production readiness without evidence.
