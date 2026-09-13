# Architecture

## System Flow
Client surface → API/Webhook → n8n orchestration → Discovery routing → specialized agent → validation/review → persistence/output

## အဓိက Components
- Client surfaces: Glide / web / admin
- Orchestration: n8n
- Data / state: Supabase Postgres
- Retrieval: RAG လိုအပ်သည့်နေရာတွင် Supabase pgvector
- Models: workflow လိုအပ်ချက်အလိုက်ရွေးချယ်မည်။ Model တစ်ခုကို architecture invariant အဖြစ် lock မလုပ်ရ။
- Human review: low-confidence, policy-sensitive သို့မဟုတ် escalation case များတွင်အသုံးပြုမည်။
- Diagram output: SOP နှင့် Org Chart အတွက် `.drawio`

## Agent Routing
Discovery Agent သည် request ကို normalize လုပ်ပြီး intent ကိုခွဲမည်။ ထို့နောက် သက်ဆိုင်ရာ specialized agent သို့ handoff လုပ်မည်။

- HR intent → HR Consultant Agent
- SOP intent → SOP Agent
- Org Chart intent → Org Chart Agent

Discovery Agent သည် specialized domain output ကိုကိုယ်တိုင် fabricate မလုပ်ရ။

## Boundaries
- Production agent များသည် project scope သို့မဟုတ် architecture ကို silent ပြောင်းလဲခွင့်မရှိ။
- n8n သည် orchestration layer ဖြစ်သည်။ Durable state လိုအပ်ပါက Supabase တွင်သိမ်းမည်။
- Platform operational knowledge ကို `platforms/` အောက်တွင်ထားမည်။ Executable source ကို native source directory တွင်ထားမည်။
- Material architecture decision များကို `.ai-architect/decisions/` တွင် ADR အဖြစ်မှတ်တမ်းတင်မည်။
- SOP / Org Chart canonical diagram artifact သည် `.drawio` ဖြစ်သည်။ PNG generation သည် default production path မဟုတ်ရ။
