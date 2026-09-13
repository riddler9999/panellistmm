# GitHub

GitHub က repository history, review နဲ့ collaboration source ဖြစ်တယ်။

## Rules
- `main` ကို stable integration branch အဖြစ်ယူမယ်။
- Material implementation ကို reviewable commits/PRs နဲ့လုပ်ဖို့ဦးစားပေးမယ်။
- Destructive Git operations, force push, branch deletion, merge to main စတာတွေကို approval မရှိဘဲမလုပ်ရ။
- Git history က raw change history ဖြစ်လို့ `learnings/CHANGELOG.md` မှာ commit-by-commit diary ထပ်မရေးရ။ Changelog မှာ semantic project changes ပဲမှတ်ရမယ်။
- Secrets ကို commits, issues, PR descriptions, logs ထဲမထည့်ရ။
