# Vercel Deployment

Vercel ကို project မှာတကယ် deploy target အဖြစ်အသုံးပြုတဲ့အခါ ဒီ runbook ကိုဖြည့်မယ်။

## Production Gate
Code change → tests → Preview deployment → Preview verification → human approval → Production deployment → smoke test

## Rules
- Production ကို code generation ပြီးတာနဲ့ တန်း deploy မလုပ်ရ။
- Production environment variables ပြောင်းခြင်းကို approval မရှိဘဲမလုပ်ရ။
- Preview နဲ့ Production environment တူမယ်လို့ မယူဆရ။
- Deployment failure ဖြစ်ရင် evidence နဲ့ root cause ကိုစစ်ပြီးမှ retry/fix လုပ်ရ။

Project-specific build command, root directory, domain နဲ့ runtime values ကို verified ဖြစ်မှ documentation ထဲထည့်ရမယ်။
