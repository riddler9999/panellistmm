# Pocket HR authentication resolution — verification

ရက်စွဲ: 2026-10-14။ Target: PR #13၊ `feat/pocket-hr-embed-dashboard`။

## Outcome

**Authentication implementation / private-data production release: BLOCKED.**

Requirement အားလုံးပြည့်သော verified Glide-to-Vercel identity path မရှိသေးကြောင်း [ADR-003](../../.ai-architect/decisions/ADR-003-pocket-hr-authentication-resolution.md) တွင် သက်သေအကန့်အသတ်နှင့် ရွေးချယ်စရာများကိုခွဲရေးထားသည်။ Product auth feature အသစ်၊ API enablement၊ production deployment၊ business-data write မလုပ်ထား။

## ဤပြောင်းလဲမှုတွင် လုပ်ခဲ့သည့်အရာ

- `ConsultationDashboard.tsx`: Details tab ၏ artifact status JSX expression တွင်ပျောက်နေသော `}` တစ်လုံးပြန်ထည့်သည်။ Approved design၊ CSS၊ component layout မပြောင်း။
- `pocketHrAuth.test.ts`: အမြဲအောင်နေသည့် `expect(true).toBe(true)` ကိုဖယ်ပြီး real GET/POST handlers အတွက် spoofing attempts 8 မျိုးစီ၊ test 16 ခုဖြင့်အစားထိုးသည်။ URL identity၊ client headers၊ `verified:true` body၊ Origin/Referer၊ forged bearer၊ legacy signed ticket token၊ forged session cookie နှင့် no-identity case တို့ကိုစမ်းသည်။ 403 + private/no-store + no outbound storage request ကိုစစ်သည်။
- `PocketHrSignIn.tsx`: Caller မရှိသော legacy status component မှ unused login callback parameter ဖယ်သည်။ Login screen အသစ်မထည့်။
- `consultationAccess.test.ts`: Forged-role case ၏ `any` cast ဖယ်ပြီး actual extra-property object ဖြင့်စမ်းသည်။
- `pocketHrData.ts`: Existing DB response type `any` ကို generic response type နှင့် approval/delivery row types ဖြင့်အစားထိုးသည်။ Query၊ release policy၊ runtime data behavior မပြောင်း။ ဤ TypeScript types သည် runtime schema validation မဟုတ်။
- `vercel.json`: ဒီ PR branch ၏ automatic deployment ကိုပိတ်ထားသည်။ Private endpoint enablement နှင့် production deploy ကို verification အရင်မလုပ်ရန် user requirement အတွက်ဖြစ်သည်။
- `ADR-003` နှင့် auth handoff docs: Current decision၊ stale PIN proposal supersession၊ documented capability / inference ခွဲခြားမှုနှင့် release blockers ကိုမှတ်တမ်းတင်သည်။

## Baseline evidence

စတင်စစ်ဆေးသည့် source: `f89cbfea85c2ccec0ca72fd23693c1b30928fa80`။

- GitHub Actions [run 38554601174](https://github.com/riddler9999/panellistmm/actions/runs/38554601174): failure။ Unit-test step fail၊ typecheck/lint/build/browser steps skipped။
- Local baseline `npm test -- --run`: 23 suites pass၊ dashboard suite parse failure၊ executed tests 69 pass။
- Local baseline `npm run typecheck`: `ConsultationDashboard.tsx(72,918): TS1005: '}' expected`။
- Missing brace ကိုပြင်ပြီး focused test run: 2 suites၊ 18 tests pass။ ဤအချက်သည် parser defect အတွက် red → green evidence ဖြစ်သည်။ Auth rejection tests သည် existing deny-all policy ၏ regression tests ဖြစ်ပြီး new login implementation အတွက် red → green ဟုမဆိုရ။
- Full suite ပြန်စမ်းရာ 24 suites၊ 86 tests pass။
- ပထမ lint run တွင် existing unused callback နှင့် `any` errors 3 ခုတွေ့၍ အထက်ပါ focused changes ဖြင့်ပြင်သည်။

## Verification commands

Directory: `apps/answer-viewer-sandbox`။

```bash
npm install --ignore-scripts --no-audit --no-fund --package-lock=false
npm test -- --run
npm run typecheck
npm run lint
npm run build
```

အထက်ပါ final verification command sequence ကို lint fixes အပြီးတစ်ကြိမ်လုံး run ခဲ့ပြီး exit code 0 ရသည်။ **24 suites / 86 tests PASS၊ typecheck PASS၊ lint PASS၊ production build PASS**။ Production authentication gate မဖွင့်ထားသဖြင့် ဤရလဒ်သည် new identity flow အောင်မြင်ကြောင်းမဟုတ်။

Repo တွင် lockfile မရှိသဖြင့် `npm ci` မရ။ Existing CI ၏ npm-install flow ကိုသာသုံးခဲ့ပြီး dependency versions/configuration အသစ်မပြောင်း။ Existing `latest` dependency specifiers ကြောင့် နောက်ပိုင်း install reproducibility risk ကျန်သည်။ Local runtime Node `v24.19.0`၊ GitHub workflow runtime Node 22 ဖြစ်၍ exact pushed commit ၏ CI result ကိုသီးခြားစစ်ရန်လိုသည်။

## Security evidence ၏အဓိပ္ပာယ်

| စမ်းသပ်မှု | အတည်ပြုနိုင်သည့်အရာ | အတည်မပြုနိုင်သည့်အရာ |
|---|---|---|
| Real handlers + spoofed claims | Identity မရှိလျှင် private reads/writes မလုပ်ဘဲ deny | Legitimate Glide user login အောင်ခြင်း |
| `consultationAccess.test.ts` | Trusted fixture principal အတွက် own-list/direct-ID isolation၊ role registry mapping၊ draft filtering | Actual Glide Row Owner settings / real consultant assignment |
| `liveConsultation.test.ts` | Mock Sheets/proof repository နှင့် owner filtering၊ approved snapshot + matching successful delivery gate | Live A/B account E2E၊ n8n actual delivery acknowledgement |
| `deliveryPolicy.test.ts` | Release policy ၏ negative/positive fixture cases | Live delivery ledger မှန်ကန်ကြောင်း |
| Dashboard tests | Fail-closed notice နှင့် sample preview rendering | Reference screenshots နှင့် pixel-level match၊ mobile Glide iframe UAT |

**Real User A/User B isolation E2E: NOT RUN.** Verifiable Glide user sessions/configuration မရသေး။ Deny-all endpoint တစ်ခုကိုလူနှစ်ယောက်ကဖွင့်၍ data မရခြင်းကို functional isolation PASS ဟုမဆိုရ။

## Live evidence နှင့် remaining gates

- Sheet header read: 34 actual columns၊ revision/delivery acknowledgement columns မတွေ့။ Ticket values/HR content မဖတ်ဘဲ headers သာစစ်သည်။
- Supabase read-only counts: accounts/sessions/auth users/approvals/deliveries = 0။ No credential provisioning၊ no migration။
- Production deployment SHA `6e58f314a7d906764409452b94a8a05f1130f05c` သည် reviewed branch HEAD မဟုတ်။ Consultation GET probes နှစ်ခုသည် 500 `FUNCTION_INVOCATION_FAILED` ဖြစ်သည်။ Expected authorization 403 ကို live အတည်မပြုနိုင်။
- Runtime logs: deployment-scoped error query မှ log မရ။ 500 ၏ root cause ကို JSX issue ဟု မဆက်စပ်သတ်မှတ်ထား။ Frontend parse failure နှင့် deployed function invocation failure သည် သီးခြား findings ဖြစ်သည်။
- Glide builder: sign-in/account landing ဖြစ်၍ authenticated project configuration၊ SSO entitlement၊ User Profile/Role registry၊ Row Owners၊ Call API user binding ကိုမစစ်နိုင်သေး။ Glide Support ကိုမဆက်သွယ်ခဲ့။
- n8n approval/delivery wiring ကို ဤ task တွင် live revalidate မလုပ်ခဲ့။ Supabase success marker တစ်ခုကို actual n8n delivery proof ဟုမထင်ရ။

Release အတွက် verified identity source + trusted role provisioning + genuine A/B/Consultant iframe tests + actual approval/delivery contract + deployed runtime validation လိုသည်။ Local tests/build သာအောင်ခြင်းက release permission မဟုတ်။ New commit CI result ကို exact SHA ဖြင့် final report တွင်ဖော်ပြရန်။
