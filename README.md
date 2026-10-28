# Site X-ray (BG) 🩻

**Paste a website. Get a plain-Bulgarian report in 30 seconds on the 3 problems costing a local business its customers — and how to fix them.**

Code detects the problems. AI explains them. A validation layer guarantees the AI never invents a finding.

> 🎥 **Demo:** _[60s video — add on Day 7]_
> 🔗 **Live:** _[vercel URL — add on Day 1]_
> ![demo](docs/demo.gif) _(add on Day 7)_

---

## The problem
Most Bulgarian small businesses are far behind on digital: in 2023, 70.6% of Bulgarian enterprises had *very low* digital intensity — the second-highest share in the EU (Eurostat). Owners often can't tell whether their website is quietly losing them calls and bookings.

Existing audit tools (Lighthouse, PageSpeed, SEO graders) speak to developers, in English, in scores. A restaurant owner in Plovdiv doesn't care about "LCP 6.2s". They care that customers leave before the menu loads.

## The solution
Site X-ray runs 8 deterministic checks on a homepage, scores it, and asks Claude to explain the top problems **in plain Bulgarian, framed as lost customers** — then publishes a shareable report link that opens nicely in Viber.

It's built for an agency workflow: audit a prospect → send the link → start a conversation with proof, not a generic pitch.

## How it works
```
URL → validate + rate limit
    → [PageSpeed Insights API ‖ HTML fetch]       (parallel)
    → 8 deterministic checks → findings with evidence
    → weighted score                               (code, not AI)
    → Claude Haiku → Bulgarian explanation         (forced tool use, structured JSON)
    → validateExplanation                          (rejects invented IDs & numbers)
    → Upstash Redis → /r/[id] shareable report
```
If the AI call fails or its output doesn't validate, the report still renders from the deterministic findings with templated text. **The AI is never a single point of failure.**

### The 8 checks
| Check | What it looks for |
|---|---|
| Mobile speed | PageSpeed mobile performance score |
| Load time | Largest Contentful Paint on mobile |
| HTTPS | Secure connection |
| Click-to-call | A `tel:` link customers can tap |
| Contact / booking CTA | Form, booking link, Viber/WhatsApp, "Контакти" |
| Title & description | What shows up in Google |
| Mobile usability | Responsive viewport |
| Local signals | Address, Google Maps, LocalBusiness data |

### The "no invented findings" guarantee
`validateExplanation` rejects any AI output that:
1. references a finding that wasn't detected,
2. contains a number that isn't in the detected evidence,
3. has the wrong number of problems.

Tests in `tests/validateExplanation.test.ts` prove each rule.

## Stack
Next.js (App Router, TypeScript) · Tailwind · Vercel · Google PageSpeed Insights API · Anthropic API (Claude Haiku 4.5) · zod · cheerio · Upstash Redis + Ratelimit · Vitest

Cost: free tiers + ~$0.01 per audit in Claude API usage.

## Run locally
```bash
git clone https://github.com/dani-aisystems/site-xray-bg
cd site-xray-bg
npm install
cp .env.example .env.local   # add PSI_API_KEY, ANTHROPIC_API_KEY, Upstash keys
npm run dev                  # http://localhost:3000
npm run audit:cli -- https://example.bg   # audit from the terminal
npm test                     # unit + validation tests
```

## What I learned
_[Fill on Day 7 — 3–5 honest bullets. Prompts:]_
- _Where did deterministic code beat the LLM?_
- _What did the validation layer actually catch?_
- _What did real prospects say when they got a report?_
- _What would I cut / do differently?_

## Roadmap (v2)
Contact-gated full plan · "no website" flow · batch audits from Google Maps · prospect list · PDF export. See [`V2.md`](V2.md).

---
Built in 7 days as **Project of the Week #1** by [Daniel Yanchev](https://github.com/dani-aisystems) · DM Digital Partners, Plovdiv.
