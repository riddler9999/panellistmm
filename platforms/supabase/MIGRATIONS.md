# Supabase Migration Rules

Database schema changes ကို versioned migration အဖြစ်ထားရမယ်။ Production database ကို manual destructive edit မလုပ်ရ။

## Gate
1. Requirement / ticket ကိုစစ်
2. Existing schema နဲ့ migration history ကိုစစ်
3. Smallest safe migration ရေး
4. Local/staging verification လုပ်
5. Data-loss risk စစ်
6. Production migration အတွက် human approval ရယူ
7. Apply ပြီး post-migration verification လုပ်

Destructive operation, RLS/security boundary change, irreversible data transformation တွေကို explicit approval မရှိဘဲမလုပ်ရ။
