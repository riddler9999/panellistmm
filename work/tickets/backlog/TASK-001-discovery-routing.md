# TASK-001 — Discovery Routing Baseline

## Status
BACKLOG — owner decision (2026-09-15) အရ HR Consultant Agent (SPEC-002) ကို ဦးစားပေးပြောင်းထားသည်။ ဤ ticket ၏ content မပြောင်းလဲပါ၊ ပြန်စရန်အသင့်ရှိသည်။

## Spec
`work/specs/SPEC-001-discovery-routing.md`

## Goal
Discovery layer အတွက် request validation, intent classification, structured handoff နှင့် safe fallback behavior ကို implementation-ready အဆင့်သို့ပို့ရန်။

## Scope
- Discovery input contract
- Required field validation
- Intent classification
- Structured handoff payload
- Unknown/ambiguous routing
- Failure state contract
- Request/company/user scope preservation

## Out of Scope
- HR Consultant domain answer generation
- SOP generation logic
- Org Chart generation logic
- Production deployment
- Production DB migration

## Relevant Context
- `project/PLAN.md`
- `project/SCOPE.md`
- `project/REQUIREMENTS.md`
- `project/ARCHITECTURE.md`
- `platforms/n8n/`
- `platforms/supabase/` only if persistence/idempotency storage is introduced

## Acceptance Criteria
- [ ] Required fields are validated before any agent handoff.
- [ ] HR request routes to `hr_consultation`.
- [ ] SOP request routes to `sop_generation`.
- [ ] Org Chart request routes to `org_chart_generation`.
- [ ] Ambiguous request routes to `unknown` / clarification instead of forced routing.
- [ ] `request_id`, `company_id`, `user_id` remain unchanged through handoff.
- [ ] Output contract is structured and testable.
- [ ] At least five representative test cases are recorded and pass.
- [ ] No unrelated workflow or architecture changes are introduced.

## Completion Gate
Acceptance criteria အားလုံးအတွက် observable verification evidence မရှိသေးလျှင် `COMPLETED` မသတ်မှတ်ရ။
