# ADR-003 — Pocket HR authentication resolution

ရက်စွဲ: 2026-10-14 (Asia/Yangon)

အခြေအနေ: **BLOCKED — requirement အားလုံးပြည့်သော identity handoff ကို လက်ရှိရရှိသော evidence ဖြင့် အတည်မပြုနိုင်သေး။**

## ဆုံးဖြတ်ချက်

Glide native login၊ ရှိပြီးသား React dashboard၊ Google Sheets၊ n8n approval/delivery workflow ကို ထိန်းထားမည်။ `/api/consultation` နှင့် `/api/consultation-approve` ကို ဖွင့်ရန်ခွင့်ပြုသည့် authentication architecture အသစ် **မရွေးချယ်ရသေး**။ Email/Row ID/role/header ကို ယုံပြီး 403 ကိုဖြုတ်မည်မဟုတ်။

ဤဆုံးဖြတ်ချက်သည် “Glide ဖြင့် မည်သည့် secure integration မဆို မဖြစ်နိုင်” ဟုဆိုခြင်းမဟုတ်။ Public documentation တွင် third-party server က verify လုပ်နိုင်သော current-user assertion ကို မတွေ့သေးခြင်းနှင့် လက်ရှိ Glide builder configuration ကို မစစ်နိုင်ခြင်းသည် သီးခြား evidence limitations ဖြစ်သည်။ မတွေ့သော capability ကို မရှိဟုသက်သေပြပြီးသားဟု မသတ်မှတ်ရ။

User ၏ ယခု instruction သည် အရင် PIN/OTP/session proposal များထက် ဦးစားပေးသည်။ Additional login၊ PIN၊ OTP၊ magic-link login မထည့်ရ။

## အတည်ပြုပြီးသော လက်ရှိအခြေအနေ

- စစ်ဆေးမှုစတင်သည့် PR #13 HEAD: `f89cbfea85c2ccec0ca72fd23693c1b30928fa80`၊ branch `feat/pocket-hr-embed-dashboard`။
- `api/consultation.ts` နှင့် `api/consultation-approve.ts` သည် allowed HTTP method အတွက် 403 ပြန်သည့် unconditional guards ဖြစ်သည်။ Identity verifier မရှိသေး။
- `src/server/liveConsultation.ts` သည် caller က verify လုပ်ပြီးသား `Principal` လိုအပ်သည်။ `resolvePrincipal({verified:true}, registry)` သည် internal mapping helper သာဖြစ်ပြီး signature/session verifier မဟုတ်။ Request body ကို ထို helper ဆီ ပို့၍မရ။
- Google Drive connector ဖြင့် `Panellist HR Tickets Bridge` ၏ metadata နှင့် `Sheet1!A1:AH1` ကိုဖတ်ခဲ့သည်။ Columns 34 ခုရှိပြီး `Row ID`, `Owner_Email`, `Admin_Role`, `Final_Answer` အပါအဝင် လက်ရှိ mapping နှင့်ကိုက်ညီသည်။ Owner column ရှိခြင်းသည် Glide Row Owners configuration ကိုစစ်ပြီးကြောင်း မဆိုလို။
- Supabase `apnvkmwcmfpkkifzmdfc` တွင် read-only count အရ `pocket_hr_accounts`, `pocket_hr_sessions`, `auth.users`, `pocket_hr_approvals`, `pocket_hr_deliveries` တို့အားလုံး 0 rows ဖြစ်သည်။ Existing Supabase users သို့မဟုတ် proof records ကို reuse လုပ်နိုင်ပြီဟု မယူဆရ။
- Production Vercel deployment `dpl_F1SaSyE83J8KMDhwdg7KbzKoYQw2` သည် commit `6e58f314a7d906764409452b94a8a05f1130f05c` ကို serve လုပ်နေသည်။ PR HEAD နှင့်မတူ။
- 2026-10-14 11:18 UTC ဝန်းကျင် production `GET /api/consultation` နှင့် forged email/role/bearer ပါသော GET နှစ်ခုလုံး **500 FUNCTION_INVOCATION_FAILED** ပြန်ခဲ့သည်။ Private response မရသော်လည်း authentication rejection PASS ဟုမသတ်မှတ်ရ။ Scoped Vercel error-log query မှ entries မရသဖြင့် runtime root cause မသတ်မှတ်နိုင်သေး။
- Glide builder ကိုဖွင့်ရာ signed-in project မပေါ်ဘဲ account creation/sign-in landing ပေါ်သည်။ လက်ရှိ plan၊ SSO၊ User Profile source၊ Role source၊ Row Owners နှင့် integration secret configuration ကို စစ်ပြီးကြောင်း မပြောရ။
- ဤလုပ်ဆောင်မှုတွင် n8n production workflow၊ Sheets records၊ Supabase schema/data၊ credentials ကို မပြောင်းခဲ့။ n8n ၏ အရင် repo evidence ကို current live revalidation ဟု မယူရ။

## Official documentation နှင့် inference ကိုခွဲခြားခြင်း

1. **Web Embed** သည် URL သို့မဟုတ် URL column ဖြင့် external page ထည့်နိုင်ကြောင်းဖော်ပြသည်။ Signed identity assertion၊ JWT export၊ JWKS endpoint၊ token introspection သို့မဟုတ် authenticated `postMessage` SDK contract ကို ထို documentation တွင်မဖော်ပြထား။ [Web Embed](https://www.glideapps.com/docs/essentials/components/web-embed)
2. **Call API** သည် endpoint၊ header/body values၊ secret values နှင့် response column ကို configure လုပ်နိုင်သည်။ Business/Enterprise availability ကိုဖော်ပြသည်။ Shared integration secret သည် integration authentication အတွက်သုံးနိုင်သော်လည်း caller-supplied email ကို login user နှင့် cryptographically bind လုပ်ပြီးသားဟု documentation က မအာမခံထား။ ဒုတိယအချက်သည် security analysis ဖြစ်သည်။ [Call API](https://www.glideapps.com/docs/automation/integrations/call-api)
3. **Row Owners** ကို Glide server က enforce လုပ်ပြီး current user မပိုင်သော rows ကို download မလုပ်နိုင်စေသည်။ ၎င်းသည် service-account ဖြင့် Sheets ကိုတိုက်ရိုက်ဖတ်သည့် Vercel API အတွက် authorization မဟုတ်။ [Row Owners](https://www.glideapps.com/docs/essentials/security-and-user-data/row-owners)
4. **Roles** နှင့် Row Owners တွဲသုံးရန် documentation ကညွှန်ထားသည်။ Visibility condition သာဖြင့် private data မကာကွယ်နိုင်။ [Roles](https://www.glideapps.com/docs/essentials/security-and-user-data/roles)
5. **Team SSO** သည် Enterprise add-on အဖြစ် SAML/OIDC IdP ကိုချိတ်နိုင်သည်။ Glide သည် ထို IdP ၏ relying party ဖြစ်ခြင်းကို လက်ရှိ Vercel app အတွက် IdP ဖြစ်ခြင်းနှင့် မရောရ။ [SSO](https://www.glideapps.com/docs/essentials/security-and-user-data/single-sign-on)
6. **AI Custom** တွင် native data/action bindings ရှိပြီး beta ဖြစ်သည်။ ရှိပြီးသား Vite/React application ကို မပြောင်းဘဲ import လုပ်နိုင်သည့် SDK ဟုမဖော်ပြထား။ [AI Custom](https://www.glideapps.com/docs/essentials/components/ai-custom)
7. **Protected Columns** သည် sensitive columns ကို Glide က download/process မလုပ်နိုင်စေသည်။ Consultant သာဖတ်ခွင့်ပေးမည့် per-role column policy နှင့် မတူ။ [Protected Columns](https://www.glideapps.com/docs/essentials/security-and-user-data/protected-columns)

## နည်းလမ်းနှိုင်းယှဉ်ချက်

| နည်းလမ်း | Security / verified identity | Complexity / maintenance | UX | Compatibility / ဆုံးဖြတ်ချက် |
|---|---|---|---|---|
| Web Embed ထဲသို့ email/Row ID/role ပို့ | Caller ပြင်နိုင်၍ identity မဟုတ် | နည်းသော်လည်း access bypass ဖြစ် | Login တစ်ကြိမ် | Requirements 5–7 မပြည့်၊ ပယ်ချ |
| Native Glide session/token ကို Vercel က verify | Issuer/audience/signature/session contract ရလျှင် သင့်တော် | နည်း–အလယ် | Silent handoff ဖြစ်နိုင် | ထို supported contract ကိုမတွေ့၊ မထွင်ရ |
| Call API shared secret + email | Integration ကိုသာ authenticate; user binding သီးခြားလို | အလယ်၊ secret rotation/abuse control လို | Extra screen မလိုနိုင် | Signed-in subject ကို server ကသတ်မှတ်ပြီး client မလွှဲနိုင်ကြောင်း မစစ်နိုင်သေး |
| Secure S2S broker + one-use exchange | Trusted upstream subject၊ audience/expiry/replay binding ရမှလုံခြုံ | အလယ်၊ issuance/revocation lifecycle လို | Login screen ထပ်မလိုနိုင် | Feasible candidate; upstream identity source/Glide configuration မရှိသေး၍ verifier တစ်ခုတည်းရေးလည်းမပြီး |
| Row-owner-gated opaque bootstrap credential | Server-issued subject-bound credential ကိုမှန်ကန်သော private row မှပေးနိုင်လျှင် delegated access ဖြစ်နိုင် | အလယ်၊ immutable subject mapping၊ expiry၊ rotation၊ replay၊ logout/revocation စမ်းရ | Silent embed handoff ဖြစ်နိုင် | အလိုအလျောက် insecure မဟုတ်။ Actual Row Owners၊ credential provisioning၊ trusted consultant registry ကိုမစစ်နိုင်သေး။ Bearer URL ကို magic-link အစားနာမည်ပြောင်းရုံဖြင့် requirement ပြည့်သည်ဟုမဆိုရ |
| Shared IdP SSO reuse | Vercel အတွက်သီးခြား audience ရှိသော OIDC code/token ကို verify | အလယ်–မြင့်၊ Enterprise/IdP operations လို | Existing IdP session ရှိလျှင် re-login မလိုနိုင် | Configured shared IdP evidence မရှိ။ Consent၊ session expiry၊ third-party-cookie/iframe limitations ကြောင့် zero-extra-screen UX ကို မအာမခံနိုင် |
| Glide-native Row Owners + private data presentation | Glide က identity/row isolation ကို enforce | နည်း၊ native platform maintenance | Glide login တစ်ခု | Existing external React app ကို unchanged replacement မလုပ်နိုင်။ Native UI migration သို့ data adapter အသစ်လို |
| Glide မှ authorized payload ကို React display-only အဖြစ်ပို့ | Data release ကို Glide ကဆုံးဖြတ်၊ payload က API identity မဟုတ် | အလယ်၊ safe projection၊ refresh/size limits လို | Extra login မလို | Read-only presentation candidate; existing authenticated live loader/writes ကိုမဖြေရှင်း။ Full private rows ကို URL query ထဲမထည့်ရ |
| Same domain / reverse proxy / hosting ပြောင်း | Domain တူခြင်းက authenticated principal မဖန်တီး | အလယ်–မြင့်၊ proxy/cookie operations တိုး | UI ဆင်တူ | Supported identity source မရှိလျှင် blocker မပြေလည် |
| Existing signed answer-viewer URL reuse | Ticket capability ကိုverify လုပ်နိုင်၊ current Glide user/consultant role မဟုတ် | နည်း၊ သို့သော် token scope မကိုက် | Bearer-link access | Account-wide consultation/consultant authorization အဖြစ် မသုံးရ |

## Exact trust boundary နှင့် အနည်းဆုံးလိုအပ်ချက်

`Glide authenticated session → authenticated upstream subject → Vercel verifier → trusted role registry → Owner_Email filter → approval + delivery proof → client-safe projection`

ပျောက်နေသည်မှာ ပထမနှင့် ဒုတိယအဆင့်ကြား **ယုံကြည်နိုင်သော handoff** ဖြစ်သည်။ URL၊ request header၊ Sheet login log မှ user email ရရှိခြင်းက ထို proof မဟုတ်။ n8n က unverified email ကို JWT sign ပေးလိုက်လျှင်လည်း unverified claim ကို sign လုပ်ခြင်းသာဖြစ်သည်။

Glide builder access ရလာခြင်းက requirement ပြောင်းခြင်းမဟုတ်။ လက်ရှိ project ၏ Row Owners၊ User Profile source၊ SSO နှင့် Call API flow ကိုစစ်ပြီး documented identity binding သို့မဟုတ် protected bootstrap channel ကို အတည်ပြုနိုင်လျှင် constraints မပြောင်းဘဲ feasibility ကိုဆက်စမ်းနိုင်သည်။ Read-only docs မတွေ့ခြင်းကိုအကြောင်းပြ၍ Enterprise ဝယ်ခိုင်းခြင်း၊ UI ပြန်ရေးခြင်း မလုပ်ရ။

ထို capability မရလျှင် architectural requirement တစ်ခုကို ပြောင်းရန်လိုသည်။

- **Existing React + server APIs ကိုထိန်းမည်ဆိုလျှင်:** Glide/Vercel နှစ်ခုလုံး verify လုပ်နိုင်သော shared IdP ကို login authority အဖြစ်ခွင့်ပြုရန်။ Native-only identity assumption ပြောင်းမည်။ Separate Pocket HR login screen မထည့်ဘဲ single-sign-on UX ကိုစမ်းရမည်။ Enterprise entitlement/IdP/session behavior အတည်ပြုမရမီ implementation ကိုအောင်မြင်ပြီဟုမဆိုရ။
- **Glide native login ကိုအတိအကျထိန်းမည်ဆိုလျှင်:** Private-data authorization/presentation ကို Glide အတွင်းထားပြီး external React ကို presentation-only adapter အဖြစ်ပြောင်းရန်၊ သို့မဟုတ် private sections ကို native components ဖြင့်ပြရန်။ ဤရွေးချယ်မှုသည် လက်ရှိ unchanged React/live API requirement ကိုလျှော့ခြင်းဖြစ်၍ ယခုမလုပ်ထား။

နှစ်ခုလုံးသည် လက်ရှိ requirement အားလုံးပြည့်သည့် selected solution မဟုတ်။ Missing capability ကိုအတည်ပြုမရမီ custom auth subsystem တစ်ခု ရေးထားခြင်းက production unblock မဖြစ်သဖြင့် မတည်ဆောက်ထား။

## Identity ရလာလျှင် မပြောင်းရမည့် authorization contract

- Issuer က verify လုပ်ပေးသော stable subject ဖြင့် server-controlled account/role registry ကို resolve လုပ်ရမည်။ Client role၊ `Sheet1.Admin_Role`၊ editable profile metadata ကို consultant authorization မလုပ်ရ။ Unknown/disabled/ambiguous mapping ကို deny လုပ်ရမည်။
- Native `Admin` သည် consultant privilege နှင့်တူကြောင်း actual registry ဖြင့်အတည်ပြုရမည်။ All-ticket access ကို user ကရွေး၍မရ။
- `User` အတွက် own `Owner_Email` records သာရွေးပြီးမှ approval/delivery proof ကိုဖတ်ရမည်။ Missing owner ကို public မသတ်မှတ်ရ။
- `Final_Answer` / status တစ်ခုတည်းဖြင့်မထုတ်ရ။ Matching request + revision + immutable approved snapshot + successful durable delivery acknowledgement လိုသည်။ DB record ရေးခြင်းကို n8n delivery success ဟုလွဲမပြောရ။
- Client-safe projection တွင် internal AI drafts မပါရ။ Native Row Owners က whole row ကိုပေးနိုင်သောကြောင့် User-readable Sheet1 row ထဲ internal AI fields ရှိပါက UI hide လုပ်ရုံမလုံလောက်။ Safe user projection ကို consultant/internal rows နှင့်ခွဲထုတ်ရမည်။
- Credentials သည် server-side သာရှိရမည်။ No-store response၊ replay/expiry/revocation နှင့် iframe storage behavior ကိုစမ်းရမည်။

## Verification / release

Implementation နှင့် test evidence ကို [resolution verification](../../work/reviews/2026-10-14-pocket-hr-auth-resolution-verification.md) တွင်ထားသည်။ Synthetic A/B projection tests သည် actual Glide A/B login E2E မဟုတ်။ Deny-all tests အောင်ခြင်းသည် authentication implemented ဟုမဆိုလို။

Production enable/deploy မလုပ်ရ။ PR ကို draft အဖြစ်ဆက်ထားရမည်။ Branch push က deployment မစေရန် `apps/answer-viewer-sandbox/vercel.json` တွင် branch-scoped `git.deploymentEnabled=false` ထည့်ထားသည်။ [Vercel git configuration](https://vercel.com/docs/project-configuration/git-configuration)
