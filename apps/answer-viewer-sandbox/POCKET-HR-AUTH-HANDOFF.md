# Pocket HR Provisioning & Release Gate

This branch uses Supabase Auth email OTP for initial verification, followed by a four-digit PIN and a server-side 30-day session. A Glide login log is NOT trusted identity.

**Provisioning is administrator-only.** After a user completes Supabase Auth signup and verifies their email, an authorized server administrator must verify the intended user/consultant role against the approved account roster, hash a privately chosen four-digit PIN with `hashPin` and a server-held `POCKET_HR_PIN_PEPPER`, and call `rpc/pocket_hr_provision_verified_account` using a service-role credential. The RPC accepts an Auth user UUID, verified email, role (`Admin` or `User`) and salted PIN hash. It rejects missing/unconfirmed Auth identities, mismatched email, role mismatch, and duplicate provisioning. Never publish this RPC to an anonymous client or create accounts directly from Glide login logs or URL/query email. Never store the raw PIN in Sheets, GitHub, n8n, or logs.

Runtime secret configuration (server only): `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `POCKET_HR_PIN_PEPPER`. Frontend uses a Supabase publishable key for email OTP. Check Supabase Auth email signup/invite and OTP template configuration before UAT; `create_user: false` prevents the frontend from self-registering unapproved accounts.

Before release:
- Provision approved accounts and validate email/role assignments out-of-band, using the verified Auth UUID.
- Test success/failure, repeated bad PIN, 15-minute reset, revocation, expiration, and cross-user access with separate real users.
- Complete trusted Google Sheets ticket transport and the independently acknowledged approval/delivery contract.
- Confirm browser iframe/cross-site cookie behavior inside Glide; third-party cookie restrictions may require a first-party domain.
- Keep `/api/consultation` fail-closed until the previous two items are independently verified and tests pass.

The `App: Logins` tab contains only Time/Email/Agreed and is neither a signed Glide identity assertion nor an authoritative role registry. `Sheet1.Admin_Role` belongs to ticket data and must not grant account privileges. Existing n8n Unified Orchestrator and HR Consultant Internal API output internal assessments, not proof of public delivery.
