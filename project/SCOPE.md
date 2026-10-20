# Project Scope

> **Consultation guidance:** Read the October 13 supersession note at the end before using older lifecycle or runtime instructions.

## Scope ထဲပါဝင်သည်
- HR consultation workflows
- Discovery နှင့် intent routing
- SOP generation
- Organization Chart generation
- SOP / Org Chart အတွက် `.xlsx` + `.png` paired output
- လိုအပ်သည့်နေရာများတွင် Human-in-the-loop review
- User / request scoping
- Auditability, fallback, timeout, retry နှင့် failure handling
- လိုအပ်သည့်နေရာတွင် Supabase-backed state နှင့် knowledge
- n8n orchestration
- လိုအပ်သည့် web/admin surfaces
- Glide integration နှင့် asynchronous request/response handling

## Explicit approval မရှိလျှင် Scope အပြင်ဘက်
- `company_id` / multi-company tenant scoping, tenant-specific RAG filtering နှင့် company-isolation architecture
- မသက်ဆိုင်သည့် CRM / ERP modules
- Autonomous production deployment
- Unapproved destructive database / infrastructure operations
- Silent architecture changes
- SOP / Org Chart အတွက် PNG-only output အသုံးပြုခြင်း
- Panellist project အပြင်ဘက် client workflows

## Scope Guard
Active task သည် `PLAN.md`, `SCOPE.md`, `REQUIREMENTS.md` တို့နှင့်မကိုက်ပါက implementation မစရ။ Scope အသစ်ဖြစ်ပါက owner approval တောင်းရမည်။

## Consultation-specific scope clarification — 2026-10-13
All Pocket HR AI consultation assessments (both `ASK_CLARIFICATION` and `PROVIDE_ADVICE`) require consultant approve/edit or ask clarification. Repeated clarification and reassessment, approved-only delivery, resolved read-only tickets, consultant access to all tickets and normal-user own-ticket restriction are in scope. Category-based assignment does not restrict consultant access. This does not authorize multi-company isolation, schema changes or production publication. See `project/POCKET_HR_CONTEXT_2026-10-13.md`.
