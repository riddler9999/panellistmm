# Fixes

Record fixes only after a failure has an evidence-backed root cause.

Template:

## F-XXX — Title
- Related mistake: M-XXX
- Change:
- Verification:
- Regression prevention:
- Result:

## F-001 — HITL poller draft field reconciled to `Sheet_AI_Answer`
- Related finding: `work/reviews/2026-09-20-repo-and-n8n-audit.md` §Finding 1 (🔴 Critical); handoff contract `work/reviews/2026-09-20-hitl-glide-enforcement-handoff.md` §Prerequisite (Option A)。
- Root cause: Poller `Process pending Glide Panellist requests` (`I01u0vd30Db7xSfx`) ၏ `Prepare Unified Bridge Write` node သည် AI draft ကို `AI_Answer` သို့ရေးနေသော်လည်း၊ HITL contract ၏ canonical consultant-only draft field ကို `Sheet_AI_Answer` အဖြစ်သတ်မှတ်ခဲ့သည် — field drift ကြောင့် Glide Approve (`Final_Answer ← Sheet_AI_Answer`) သည် empty value ကို copy မိနိုင်သည်။
- Change (owner-approved, 2026-09-20):
  - `Prepare Unified Bridge Write` output key `AI_Answer` → `Sheet_AI_Answer`。
  - `Keep Pending Requests` dedup guard `AI_Answer` empty → `Sheet_AI_Answer` empty (write field နှင့် consistent)。
  - `Select One Pending Row per Request` ၏ `AI_Answer` suppression ကို **မပြောင်း** — historical backlog (old poller က `AI_Answer` ရေးထားသည့် ticket) ကို re-draft storm မဖြစ်အောင်။
  - Published active version: `0adfde70-6046-48c0-a2dd-ffd6f3ae05d0`。`Final_Answer` ကို မထိ (Glide Approve/Edit action မှသာ populate)。
- Verification: publish ပြီးနောက် `get_workflow_details` ဖြင့် node ၂ ခုစလုံး live ဖြစ်ကြောင်း၊ `active: true`, `activeVersion.sameAsDraft: true` ဖြစ်ကြောင်း အတည်ပြု။ Burmese fallback string များ + `join('\n')` အားလုံး intact。
- Regression prevention: Write field နှင့် pending-dedup guard ကို **တစ်ခုတည်းသော field ပေါ်တွင်** သတ်မှတ်ရမည် — write ကိုသာ ပြောင်း၍ dedup ကို မပြောင်းလျှင် ticket တိုင်းကို ၅ မိနစ်တိုင်း infinite re-draft (duplicate LLM cost) ဖြစ်စေမည်။
- Result: n8n side reconciled + live。 **End-to-end HITL enforcement မပြီးသေး** — Glide-side enforcement (visibility conditions + Approve/Edit reads `Sheet_AI_Answer` + status gating) ကို owner က handoff contract အတိုင်း implement ရန်ကျန်ရှိသည်။
