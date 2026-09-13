# Work

ဒီ folder က approved work ရဲ့ execution frontier ဖြစ်တယ်။

## Structure
- `specs/` — architectural/substantial work အတွက် approved specifications
- `tickets/backlog/` — မစရသေးတဲ့ bounded work
- `tickets/active/` — လက်ရှိလုပ်နေတဲ့ work; default အနေနဲ့ active ticket နည်းနည်းပဲထား
- `tickets/completed/` — acceptance criteria verify ပြီးတဲ့ work
- `reviews/` — durable review artifact တကယ်လိုတဲ့အခါသာ

## Ticket Minimum Fields
- ID / Title
- Objective
- In scope / Out of scope
- Relevant requirements / ADRs
- Files or components expected to change
- Acceptance criteria
- Verification evidence
- Status

Spec/ticket မရှိသေးတဲ့အတွက် fake task files မဖန်တီးရ။
