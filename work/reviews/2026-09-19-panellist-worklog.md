# Panellist Worklog — 2026-09-19

> Recorded on 2026-09-19 (Asia/Yangon) from the current GitHub repository state and n8n saved workflow history.

## Summary

The repository had no commits newer than 2026-09-16, while the Panellist n8n implementation received several saved changes on 2026-09-18. This worklog records those runtime/integration changes so the repository reflects the actual implementation state.

## n8n changes completed on 2026-09-18

### 1. Panellist HR Consultant Intake → Saved Agent
Workflow ID: `oWB6VGMxXPT0uzI7`

The intake workflow was updated to support the Glide/Google Sheets response path:

- Added Google Sheets AI answer write-back keyed by Row ID.
- Fixed the webhook session-key mapping so the HR Consultant Agent can run correctly.
- Mapped the Agent's text response into the Google Sheets `AI_Answer` field.
- Updated the response path so the same Agent text is both:
  - returned to the webhook caller, and
  - persisted to Google Sheets.
- The workflow remains active.
- A later autosaved editor version was recorded at 2026-09-18 14:45 UTC.

Saved n8n versions:
- `bbfe712d-9d15-4334-9fc2-28bfd0c0417a` — Add Google Sheets AI answer write-back
- `fc58cb88-cde1-4cb6-8afe-00541185970f` — Fix session key and keep Google Sheets write-back
- `951fbe82-cd52-4273-a7a8-91bb5e53bfa1` — Map agent text into Google Sheets AI answer
- `40211d1b-9522-4f29-add5-c159fb387849` — Return and store the agent text response
- `2011bb08-4f1d-4feb-b686-c53255def66e` — later autosaved state

### 2. Panellist HR Consultant Feedback Learning
Workflow ID: `JLRgWiR9UaAVe6eu`

The feedback-learning workflow was updated for Glide ticket-row compatibility:

- Added normalization for Glide Tickets row field-name aliases.
- Preserved strict `EDITED` feedback validation.
- Preserved idempotent correction storage behavior.
- The workflow remains active.

Saved n8n version:
- `4acbd529-9882-481e-ac51-ad828e62e88a` — Accept Glide Tickets row field names

## Current Panellist n8n workflows observed

Active implementation includes, among others:

- Panellist HR Consultant Intake → Saved Agent
- Panellist HR Consultant Feedback Learning
- Panellist HR KB Search — Agent Tool
- Panellist Drawio Renderer — Agent Tool
- Panellist Drawio Artifact Download
- Panellist Document Architect v3

Supporting/one-time workflows also remain present for KB ingest and correction-learning paths.

## Repository status before this log

- Repository: `riddler9999/panellistmm`
- Default branch: `main`
- Latest repository commits observed before this worklog were dated 2026-09-16.
- Therefore, the 2026-09-18 n8n integration work above was not yet reflected in Git history.

## Why this record exists

n8n remains runtime ground truth for workflow configuration and saved version history. This file is a repository-side implementation log so future work can reconcile Git documentation with the live Panellist automation state.

## Next reconciliation items

When continuing Panellist work, verify live state before changing documentation:

1. Re-check the active version of the HR Consultant Intake workflow.
2. Re-check the Feedback Learning workflow payload contract against Glide.
3. Confirm Google Sheets bridge columns still match the current Glide app.
4. Update `platforms/n8n/INVENTORY.md` if workflow roles, names, or active status change.
5. Keep runtime credentials/secrets out of Git.


## Glide HITL review inspection — verified 2026-09-19

Glide ticket review flow ကို live configuration မှာ စစ်ဆေးခဲ့သည်။ ဤအပိုင်းသည် inspection evidence သာဖြစ်ပြီး Glide setting သို့မဟုတ် ticket data ကို မပြောင်းထားပါ။

### တွေ့ရှိချက်

- `Approve` action သည် လက်ရှိ `Final_Answer ← AI_Answer` အဖြစ်သတ်မှတ်ထားသည်.
- စစ်ဆေးခဲ့သည့် ticket row တွင် `AI_Answer` နှင့် `Consultant_Answer` သည် empty ဖြစ်ပြီး n8n ဖြေစာသည် `Sheet_AI_Answer` တွင်သာရှိသည်။ ထို့ကြောင့် `Approve` နှိပ်လျှင် empty value ကို `Final_Answer` ထဲကူးသဖြင့် user-facing answer မပြောင်းပေ.
- `Approve` action သည် `Ticket_Status` ကို မပြောင်းပါ။ Published page refresh ပြီးနောက် ticket သည် `Submitted` အဖြစ်ဆက်ရှိပြီး review buttons များလည်းဆက်ပေါ်သည်.
- Button Block နှင့် `Consultant Review/Editing` field နှစ်ခုလုံးတွင် Visibility Condition မရှိပါ။ ထို့ကြောင့် Admin/Consultant သီးသန့်မဟုတ်ဘဲ normal user များလည်း Approve/Edit/Done controls ကိုမြင်နိုင်သည်.

### Implementation contract to apply later

အောက်ပါပြင်ဆင်မှုများကို သတ်မှတ်ထားသော်လည်း ဤ inspection တွင် မလုပ်ရသေးပါ.

1. Approve: `Final_Answer ← Sheet_AI_Answer` နှင့် `Ticket_Status ← Resolved`.
2. Edit ပြီး Done: `Final_Answer ← Consultant_Answer` နှင့် `Ticket_Status ← Resolved`.
3. Button Block နှင့် consultant editing field များကို Admin/Consultant role များအတွက်သာ visible လုပ်ရန်.
4. Normal user အတွက် `Final_Answer` ရှိလျှင်သာ answer ကိုပြရန်။ Unapproved `Sheet_AI_Answer` ကို normal user မှ မမြင်ရစေရန်.

### Contract reconciliation required

`SPEC-002` သည် approved draft ကို `final_answer` သို့ကူးရမည်ဟုသတ်မှတ်ထားသည်။ လက်ရှိ Glide column name သည် `AI_Answer` ဖြစ်သော်လည်း live n8n write-back သည် `Sheet_AI_Answer` တွင်ရှိနေသည်။ Implementation မစမီ n8n/Google Sheets/Glide field mapping ကို live state ဖြင့်ပြန်လည်အတည်ပြုပြီး single canonical draft field ကိုသတ်မှတ်ရမည်.
