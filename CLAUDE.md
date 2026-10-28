# CLAUDE.md — Site X-ray (BG)

## What this is
A website-audit agent for Bulgarian local businesses. Input: a URL. Output: a shareable report page (`/r/[id]`) in plain Bulgarian that explains the 3 problems costing the owner customers and how to fix them.

Primary user: Daniel (DM Digital Partners), who sends report links to prospects via Viber/Instagram/in person. Secondary: owners who paste their own URL on the public page.

**Core principle — never break this:** code DETECTS problems, AI only EXPLAINS them. The AI never decides pass/fail, never produces the score, never introduces a finding or a number that isn't in the deterministic findings.

This is a 7-day Project of the Week. Scope is fixed in `PLAN.md`.

## Scope limits (hard rules)
- **No features outside PLAN.md.** If you think something is needed, add it to `V2.md` and tell me. Do not build it.
- **Exactly 8 checks** (listed below). Never add a 9th.
- No auth, no database other than Upstash Redis, no payments, no PDF, no CRM, no multi-page crawl, no English UI.
- **No new npm dependencies** beyond the list below without asking me first.
- Do not mark a PLAN.md checkbox done until its acceptance criteria are verified (see Verification).

## Stack
- Next.js (App Router, TypeScript strict), Tailwind CSS
- Deploy: Vercel — personal account `danielaisystems-1483` (NOT the agency team)
- GitHub: `dani-aisystems/site-xray-bg`
- Allowed deps: `@anthropic-ai/sdk`, `zod`, `cheerio`, `@upstash/redis`, `@upstash/ratelimit`, `nanoid`, `vitest`, `tsx` (dev)
- External APIs: Google PageSpeed Insights v5 (free, own key), Anthropic API (model `claude-haiku-4-5`)

## Environment variables
```
PSI_API_KEY=            # Google Cloud key, restricted to PageSpeed Insights API
ANTHROPIC_API_KEY=      # account has a $5 hard spend limit
KV_REST_API_URL=        # injected by Vercel ↔ Upstash integration
KV_REST_API_TOKEN=
NEXT_PUBLIC_CTA_PHONE=  # e.g. +3598XXXXXXXX
NEXT_PUBLIC_CTA_VIBER=  # viber://chat?number=...
DAILY_AUDIT_CAP=100
```
Never commit `.env*`. Keep `.env.example` updated.

## Architecture
```
src/
  app/
    page.tsx                 # URL input + step-by-step loading state
    api/audit/route.ts       # POST {url} → {id}
    r/[id]/page.tsx          # shareable report (server component)
  lib/
    types.ts                 # Finding, CheckId, Audit, Explanation
    validateUrl.ts           # normalize URL + SSRF guard (block localhost/private IPs)
    psi.ts                   # PageSpeed call, mobile strategy, 25s timeout
    fetchHtml.ts             # fetch homepage HTML, 10s timeout, 2MB cap
    checks/                  # one pure function per check: (ctx) => Finding
      index.ts
    score.ts                 # weighted formula (code only)
    explain.ts               # Claude call via forced tool use + zod validation + fallback
    validateExplanation.ts   # anti-hallucination guard (see below)
    store.ts                 # Upstash: audit:{id}, 90-day TTL
    ratelimit.ts             # 5/hour per IP + global DAILY_AUDIT_CAP
prompts/explain-bg.md        # system prompt for the explanation
scripts/audit.ts             # CLI: `npm run audit:cli -- <url>` → prints full Audit JSON
tests/
  fixtures/                  # saved HTML + PSI JSON from real Plovdiv sites
  checks.test.ts
  score.test.ts
  validateExplanation.test.ts
```

Data flow: validateUrl → ratelimit → [psi ‖ fetchHtml] in parallel → 8 checks → score → explain (AI) → validateExplanation → store → return id.

If PSI fails/times out: checks 1–2 get `pass: null` ("unavailable"); score is computed over available checks and rescaled to 100.
If the AI call fails or validation fails: store the audit with `explanation: null`; the report page renders the deterministic findings with templated Bulgarian text from `checks/index.ts`. The report must NEVER fail because of the AI.

## Types (contract)
```ts
type CheckId = 'mobile_speed' | 'lcp' | 'https' | 'click_to_call'
             | 'contact_cta' | 'meta_tags' | 'mobile_usability' | 'local_signals';

type Finding = {
  id: CheckId;
  pass: boolean | null;          // null = could not be measured
  severity: 'high' | 'medium' | 'low';
  evidence: string;              // what was actually detected, e.g. "LCP 6.2s"
  value?: number | string;
  fallbackTextBg: string;        // templated Bulgarian sentence, used if AI fails
};

type Explanation = {
  headline: string;              // one sentence, Bulgarian
  problems: { findingId: CheckId; title: string; impact: string; fix: string }[]; // 1–3
  summary: string;
};
```

## The 8 checks (weights sum to 100)
| id | Rule (pass when…) | Weight |
|---|---|---|
| mobile_speed | PSI mobile performance score ≥ 50 | 20 |
| lcp | PSI LCP ≤ 4.0s | 15 |
| https | final URL is https | 10 |
| click_to_call | at least one `a[href^="tel:"]` | 15 |
| contact_cta | a `<form>` OR a link matching contact/booking patterns (`/contact`, `/kontakti`, `viber://`, `wa.me`, `calendly`, `booking`, text containing `резерв`, `запази час`, `контакти`) | 15 |
| meta_tags | `<title>` 10–70 chars AND non-empty meta description | 10 |
| mobile_usability | meta viewport containing `width=device-width` | 10 |
| local_signals | LocalBusiness JSON-LD OR Google Maps link/embed OR Bulgarian address pattern (`ул.`, `бул.`, `Пловдив`) | 5 |

## AI explanation rules
- Forced tool use (`tool_choice` → a single `write_report` tool whose `input_schema` matches `Explanation`). Parse with zod.
- Input to the model: business name/title, detected business type hints, and ONLY failed findings (id, evidence, severity).
- `validateExplanation` must reject when:
  1. any `findingId` is not in the failed-findings list,
  2. more than 3 or fewer than 1 problems (unless zero failures),
  3. any number in the AI text (decimals or integers ≥ 6) does not appear in some finding's `evidence`.
- On rejection: retry once, then fall back (see Architecture).
- Language: plain Bulgarian, owner-level, no jargon (no "LCP", "schema", "meta" in the text the owner sees). Frame impact as lost customers/calls, never invent statistics.

## Conventions
- TypeScript strict, no `any`. Small pure functions in `lib/`; route handlers stay thin.
- Server-only code never imported into client components. API keys never reach the browser.
- Mobile-first UI (test at 390px). All user-facing copy in Bulgarian.
- One commit per PLAN.md task, message format: `day N: <task>`.

## Verification (run before saying anything is done)
1. `npm run typecheck && npm run lint && npm test && npm run build` — all must pass.
2. For check/score/AI changes: `npm run audit:cli -- <fixture or real URL>` and paste the JSON summary.
3. For UI changes: use playwright-cli to open the page at 390px width, screenshot it, and look at the screenshot.
4. For deploy tasks: fetch the live Vercel URL and confirm a 200 + expected content.

**End every session with a report in this exact form:**
```
VERIFIED: <what you actually ran/checked and the result>
NOT VERIFIED: <what you assumed or couldn't test>
NEEDS DANIEL: <decisions or manual checks for me>
```
Daniel tends to trust output without reviewing it — be explicit about uncertainty. Never claim a test passed without running it.
