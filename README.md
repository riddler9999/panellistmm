# Panellist AI System

ဒီ repository က Panellist အတွက် AI-assisted software development နဲ့ production AI workflows တွေကို plan-first, evidence-first ပုံစံနဲ့တည်ဆောက်ဖို့ canonical source ဖြစ်တယ်။

## စတင်ဖတ်ရန်
Coding agent တွေက `AGENTS.md` → `project/CURRENT_STATE.md` → active ticket အစဉ်အတိုင်းဖတ်ရမယ်။ Project တစ်ခုလုံးကို session တိုင်းပြန်ဖတ်စရာမလိုဘူး။

## အဓိက Layer များ
- `project/` — approved plan, scope, requirements, architecture နဲ့ current state
- `.ai-architect/` — architecture contract, implementation plan နဲ့ ADRs
- `work/` — specs, tickets နဲ့ reviews
- `agent/` — context routing နဲ့ execution rules
- `platforms/` — Vercel, Supabase, n8n စတဲ့ platform-specific operational knowledge
- `learnings/` — verified mistakes, fixes, lessons နဲ့ semantic changelog
- `agents/`, `workflows/`, `knowledge/`, `apps/`, `supabase/` — implementation source များ (တကယ်လိုအပ်လာမှ ဖန်တီးမည်)

## Language
Documentation ကို မြန်မာလိုရေးမယ်။ Code, API names, identifiers, commands, file paths နဲ့ precision လိုတဲ့ technical terms တွေကို English အတိုင်းထားနိုင်တယ်။
