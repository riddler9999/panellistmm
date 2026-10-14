# ADR-004 — Admin-managed four-digit passcode (approved 2026-10-14)

Status: APPROVED DECISION; NOT YET IMPLEMENTED.
Scope: Panellist Pocket HR, existing PR #13 and React dashboard.

## Decision
- Glide remains the initial login and Web Embed container.
- The embedded React dashboard asks for a separate four-digit passcode.
- Admin provisions a distinct passcode for each User/Consultant account, with reset and disable capability.
- Vercel verifies the passcode against a server-side account registry, establishes a server-side authenticated session, and derives account email and role from that registry, never from URL parameters or caller-supplied claims.
- User requests are restricted server-side by the session account's email matched to Google Sheets `Owner_Email`. Consultant access is authorized by the server-side assigned role.
- Keep existing Google Sheets, n8n approval/delivery workflows, and approved React UI.
- Do not pursue Glide-to-Vercel identity token handoff as a prerequisite for this selected design.
- Keep implementation minimal: securely hash passcodes and limit failed attempts. No additional OTP, magic link, or separate third-party auth service.

## Explicit tradeoff
This is a separate passcode authentication step; Glide login alone is not trusted by the Vercel backend. A four-digit passcode has only 10,000 possibilities, and possession of a passcode does not cryptographically prove a Glide session. Do not claim otherwise. Protect the account registry, use server-derived identity, and prevent enumeration/brute force. Confirm the account-selection UX during implementation without treating an email query parameter as authentication.

## Implementation status
Decision recorded only. Existing deny-all consultation endpoint must remain closed until passcode sessions and per-user authorization are implemented and tested. No production deploy or migration is authorized by this documentation change.
