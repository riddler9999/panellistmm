# Glide Consultation Embed — implementation boundary (2026-10-14)

- App route: `/consultation`; normal route returns only server-projected ticket fields.
- Current `/api/consultation` is **deliberately fail closed (403)**: no trusted identity handoff has been established. Never substitute `?email=`, `?role=`, Glide visibility, or an arbitrary client header for verification.
- The pure `resolvePrincipal` function accepts only a *server-verified* identity plus a server-trusted Users role lookup. The owner must match `Owner_Email` exactly for User. Role Assistant/unknown denied.
- Any future integration must independently authenticate the principal (using a verifiable provider session, signed trusted assertion, or approved one-time handoff), then load roles and tickets through a server-only trusted transport. Request IDs must be authorized **before** history/detail lookup/projection.
- This PR does not claim functional Glide login SSO, sheet-backed listing, approval, edit, reject, clarification, reassessment, retries or live delivery. These remain incomplete and need the approved identity bridge and actual field write contract.
- The existing approved-answer viewer remains separate. No n8n workflow, Glide configuration, production Sheet, database, or credentials were changed.
- Do not enable mutations or remove the deny guard until security and idempotency end-to-end UAT can run with isolated users.
