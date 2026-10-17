# Pocket HR — Glide Native Login & Row Owners (approved 2026-10-14)

လက်ရှိ architecture comparison၊ verified limitations နှင့် minimum-change options: [ADR-003](../../.ai-architect/decisions/ADR-003-pocket-hr-authentication-resolution.md)။ Existing guard သည် production identity integration ပြီးကြောင်း မဆိုလို။

## Canonical decision
Glide owns login and row-level access. No Pocket HR email OTP, four-digit PIN, or second sign-in inside the embedded Vercel app. Do **not** treat a Glide URL/email parameter, App: Logins row, Sheet1 Admin_Role, or iframe context as verified identity.

## Confirmed Google Sheets source (read-only inspection)
Spreadsheet: Panellist HR Tickets Bridge (Sheet1).
Actual columns include `Row ID`, `Owner_Email`, `Admin_Role`, `Final_Answer`, and `🔒 Row ID`. The `Admin_Role` value in ticket rows is not proof of an authenticated user's Glide Role. Missing `Owner_Email` must never make a ticket public.

## Glide configuration (manual verification required)
1. Confirm Glide's actual User Profile source and real Role values; only then configure Admin/User role access.
2. Configure Row Owners on Requests using `Owner_Email` and a role-based owner column containing `Admin` for each request. Verify Glide's role/owner configuration using two distinct real users.
3. Admin view: All Requests. User view: My Requests. Visibility conditions alone are not data-security boundaries; Row Owners must apply to the underlying table.
4. The backing Google Sheet is accessible to the server/service account but its direct file-sharing permissions must not grant ordinary users bypass access.

## Important backend limitation
Glide Row Owners protect data served by Glide, **not** independently hosted Vercel endpoints that read Google Sheets with a service account. Until an independently verifiable server-side user identity exists, `/api/consultation` and consultation approval endpoints must remain fail-closed. Do not remove their session guard or substitute client-supplied email/role. The legacy Supabase provisioned-account/PIN/session tables and API are NOT the approved Glide authentication path.

## Release gates
- Verify Glide User Profile role mapping and the actual Row Owners configuration with Admin, User A, User B.
- Prove User A cannot read User B ticket data via Glide UI and any exposed data access route.
- Prove unauthenticated Vercel consultation and approval endpoints deny access; make no 'PASS' claim without executed tests.
- Keep PR #13 unmerged and production release blocked until these gates are evidenced.

Ponytail: reuse Glide native access controls; do not build new authentication adapters or add dependencies merely to bypass the handoff blocker.
