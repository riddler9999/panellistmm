# Panellist HR AI System — Client Delivery Package

> **Prepared for**: `<CLIENT_NAME>` (Panellist)
> **Prepared by**: `<VENDOR_NAME>` — AI Automation & Systems Engineering
> **Version**: 1.0 · **Date**: 2026-09-22 (Asia/Yangon)
> **Status**: Delivery dossier — migration/handover execution gated on final payment (§ Document 06)

ဤ package သည် Panellist HR AI System ကို client ထံ professional အဆင့် handover လုပ်ရန်အတွက် တရားဝင် delivery documentation set ဖြစ်သည်။ Document အားလုံးကို မြန်မာဘာသာဖြင့်ရေးထားပြီး၊ code / API / table / command / identifier များကို precision အတွက် English အတိုင်းထားသည်။

---

## Document Set

| # | Document | ရည်ရွယ်ချက် | Audience |
|---|----------|-------------|----------|
| 00 | [Delivery Overview & Handover Summary](00-Delivery-Overview.md) | ဘာတွေ deliver လုပ်သည်၊ တာဝန်ခွဲဝေ, acceptance path | Business owner |
| 01 | [System Architecture](01-System-Architecture.md) | System topology, data flow, components, HITL model | Business + technical helper |
| 02 | [Supabase Migration & Ownership Runbook](02-Supabase-Migration-Runbook.md) | Client Supabase သို့ database transfer + verify | Technical helper / vendor |
| 03 | [n8n Workflow Operations Guide](03-n8n-Operations-Guide.md) | Vendor-hosted workflow inventory, HITL flow, monitoring | Business + ops |
| 04 | [API & Cost Responsibility](04-API-Cost-Responsibility.md) | OpenRouter / model billing ownership, top-up | Business owner |
| 05 | [Security & Credentials Handover](05-Security-Credentials-Handover.md) | Key custody, rotation, PII / data-privacy posture | Business + technical helper |
| 06 | [Service & Maintenance Agreement](06-Service-Maintenance-Agreement.md) | လစဉ် maintenance scope, SLA, exclusions, billing | Business owner |
| 07 | [UAT / Acceptance Checklist](07-UAT-Acceptance-Checklist.md) | Client sign-off checklist | Business owner |
| 08 | [Support, Backup & DR Runbook](08-Support-Backup-DR-Runbook.md) | Escalation, backup, recovery | Business + ops |
| 09 | [Future Enhancement & Custom Development Roadmap](09-Future-Enhancement-Roadmap.md) | Scale-up options, custom app path | Business owner |

---

## How to read this package

- **Business owner** → Document 00 → 04 → 06 → 07 (ဤ ၄ ခုက commercial + acceptance အတွက်လုံလောက်သည်)။
- **Technical helper / future developer** → Document 01 → 02 → 03 → 05 → 08 (operational depth)။
- **Future custom-work planning** → Document 09။

## Compiled deliverables

Document set တစ်ခုလုံးကို client ပို့ရန် consolidated format ဖြင့် `delivery/artifacts/` တွင် compile လုပ်ထားသည် —

| File | Use |
|---|---|
| `Panellist-HR-AI-Delivery-Dossier.pdf` | Client ပို့ရန် primary deliverable (fixed rendering, Myanmar font embedded) |
| `Panellist-HR-AI-Delivery-Dossier.docx` | Editable version (placeholder ဖြည့်ရန် / client-side edit) |
| `Panellist-HR-AI-Delivery-Dossier.html` | Source render (re-generate အတွက်) |

> Markdown source (00–09) သည် source of truth ဖြစ်သည်။ Placeholder ဖြည့်/ပြင်ဆင်ပြီးနောက် artifacts ကို re-compile လုပ်နိုင်သည်။

## Fill-in placeholders

Handover မတိုင်မီ အောက်ပါ placeholder များကို ဖြည့်ရန် —

| Placeholder | ဆိုလိုရင်း |
|---|---|
| `<VENDOR_NAME>` | Developer / vendor legal or trading name |
| `<CLIENT_NAME>` | Client / organization name |
| `<CLIENT_GMAIL>` | Client Supabase / OpenRouter account email (Gmail) |
| `<VENDOR_CONTACT>` | Support contact (phone / email / Telegram) |
| `<EFFECTIVE_DATE>` | Agreement effective date |
