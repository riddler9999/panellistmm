# Pocket HR — UI အရောင်နှင့် component စည်းမျဉ်း

## အခြေခံ

Owner တောင်းဆိုထားသော [UI UX Pro Max skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/56ea9cf174ed86786187daa9de0e6247cb0747e4/.claude/skills/ui-ux-pro-max/SKILL.md) ကို ဖတ်ပြီး search script ဖြင့် minimal professional dashboard၊ contrast နှင့် React form guidance ကို ရယူထားသည်။

Skill ၏ Minimalism & Swiss Style၊ neutral surfaces၊ semantic tokens နှင့် 4.5:1 text contrast လမ်းညွှန်များကို အသုံးပြုသည်။ Generic search မှ marketing hero layout နှင့် blue palette အကြံပြုချက်ကို ဤ request dashboard တွင် မသုံးပါ။ ရှိပြီးသား Pocket HR brand purple ကို ထိန်းထားသည်။ Myanmar စာအတွက် လက်ရှိ Noto Sans Myanmar ကို ဆက်သုံးသည်။

## Color roles

CSS source of truth: `apps/answer-viewer-sandbox/src/styles.css` ၏ `.consultation-dashboard` variables။ Component တစ်ခုစီတွင် raw color အသစ် မထပ်သတ်မှတ်ရ။

| Role | Color | အသုံးပြုပုံ |
|---|---|---|
| Primary | `#6023f2` | New Request၊ Submit၊ Approve၊ Send |
| Primary hover | `#4c1dca` | Primary action hover |
| Primary soft / text | `#f3efff` / `#4c1d95` | Selected filter၊ user message၊ active navigation |
| Surface / subtle | `#ffffff` / `#f8fafc` | Form၊ card၊ consultant message |
| Text / secondary | `#0f172a` / `#475569` | Main text၊ helper text၊ metadata |
| Border / input border | `#e2e8f0` / `#8490a3` | Card separation / input boundary |
| Success | `#166534` on `#f0fdf4` | Approved / delivered status |
| Warning | `#92400e` on `#fffbeb` | Review / clarification status |
| Error | `#991b1b` on `#fef2f2` | Failed status / error text |

- Status ကို label ဖြင့်ပါ ဖော်ပြရမည်။ အရောင်တစ်ခုတည်းဖြင့် မခွဲရ။
- Request icon အားလုံး neutral ဖြစ်ရမည်။ Status အရောင်ကို badge တွင်သာ သုံးရမည်။
- Close၊ Cancel၊ Edit နှင့် Log out သည် secondary actions ဖြစ်သည်။
- User စာသည် ညာဘက် lavender surface၊ consultant စာသည် ဘယ်ဘက် neutral surface ဖြစ်သည်။ Nested colored bubbles မသုံးရ။
- SVG icons တူညီသည့် stroke style သုံးသည်။
- Control radius 10px၊ card radius 16px၊ 8px အခြေခံ spacing သုံးသည်။
- Mobile filters ကို wrap လုပ်သည်။ စာသားကျဉ်းအောင်ဖိခြင်းနှင့် အရေးကြီး label ဖျောက်ခြင်း မလုပ်ရ။

## စစ်ဆေးမှု — 2026-10-17

- Build၊ lint နှင့် 41 files / 153 tests အောင်မြင်သည်။
- `scripts/verify-consultation-theme.mjs` ဖြင့် mocked authorized data သုံးပြီး Chromium တွင် 375×812၊ 768×1024၊ 1024×768၊ 1440×1000၊ 812×375 စစ်ဆေးအောင်မြင်သည်။
- Text color pairs ≥4.5:1၊ input boundary ≥3:1၊ primary button color consistency၊ keyboard focus၊ navigation၊ overflow၊ reduced-motion နှင့် 20px root font reflow စစ်ဆေးထားသည်။
- Light theme အတွက်သာ စစ်ဆေးထားသည်။ Live deployment နှင့် live n8n data submission မလုပ်ထားပါ။

Browser verification ပြန်လုပ်ရန် Playwright နှင့် Chromium ရှိသည့် environment တွင် Vite ကို run ပြီး `node scripts/verify-consultation-theme.mjs` ကို app directory မှ run ပါ။ လိုအပ်လျှင် `CHROMIUM_PATH`, `UI_BASE_URL`, `UI_EVIDENCE_DIR` သတ်မှတ်နိုင်သည်။
