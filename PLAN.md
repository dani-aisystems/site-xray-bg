# PLAN.md — Site X-ray (BG) · POTW #1

Window: Thu Oct 29 → Wed Nov 4, 2026 · Budget ~11.5h incl. buffer
Rule: no new features — new ideas go to `V2.md`. No new checks after Day 2.

## Feature acceptance criteria
**F1 — Audit engine**
- [ ] `POST /api/audit {url}` returns `{id}` for a valid public URL
- [ ] All 8 checks produce a `Finding` with real `evidence`
- [ ] PSI timeout/failure → checks 1–2 `pass: null`, rest still works, total < 45s
- [ ] Rejects localhost/private IPs and non-http(s) URLs
- [ ] Unit tests for every check against saved fixtures

**F2 — Bulgarian AI explanation**
- [ ] Forced tool use + zod parse
- [ ] `validateExplanation` rejects invented finding IDs and invented numbers (tests prove it)
- [ ] Retry once, then fallback to templated text — report never breaks
- [ ] 5 real Plovdiv audits manually checked: 0 invented claims

**F3 — Shareable report `/r/[id]`**
- [ ] Shows score, headline, up to 3 problem cards, full pass/fail list, CTA (Viber + phone)
- [ ] Looks correct at 390px (screenshot checked)
- [ ] Stored in Upstash with 90-day TTL; unknown id → friendly 404 in Bulgarian
- [ ] Rate limit: 5/hour per IP + global daily cap

---

## Day 0 · Wed Oct 28 (30 min, manual — Daniel)
- [ ] Run 10 Plovdiv business sites through pagespeed.web.dev (mobile). Note: score, has click-to-call?, has contact/booking CTA?, Facebook-only?
- [ ] Pass check: ≥6/10 have 2+ clear issues (else → stop, discuss pivot)
- [ ] Pick 5 URLs as fixtures (mix: restaurant, salon, clinic, shop, service)
- [ ] Create PSI API key (restrict to PageSpeed Insights API)
- [ ] Anthropic API key + set $5 hard spend limit
**Output:** fixture list + keys ready

## Day 1 · Thu Oct 29 (1.5h) — skeleton deployed
- [ ] `create-next-app` (TS, Tailwind, App Router), push to `dani-aisystems/site-xray-bg`
- [ ] Add `.env.example`, CLAUDE.md, PLAN.md, V2.md, README draft
- [ ] `page.tsx`: URL input (Bulgarian copy) posting to `/api/audit`
- [ ] `/api/audit` stub returning mock Audit JSON; `/r/[id]` renders mock
- [ ] Vitest set up with one passing placeholder test; `typecheck`, `lint`, `test` scripts
- [ ] Deploy to Vercel (personal account); connect Upstash integration; confirm function maxDuration limit for this plan and set `maxDuration` on the route
**Output:** live URL showing input → mock report
**If behind, cut:** any styling

## Day 2 · Fri Oct 30 (1.5h) — real findings
- [ ] `validateUrl.ts` + SSRF guard + tests
- [ ] `psi.ts` (mobile, 25s timeout) and `fetchHtml.ts` (10s, 2MB cap)
- [ ] Save 5 fixtures (HTML + PSI JSON) into `tests/fixtures/`
- [ ] 8 checks in `lib/checks/` + `score.ts` + tests for each
- [ ] `scripts/audit.ts` CLI prints full Audit JSON
**Output:** `npm run audit:cli -- <url>` works on all 5 sites
**If behind, cut:** `local_signals` check (weight redistributed to contact_cta)

## Day 3 · Sat Oct 31 (2.5h) — AI explanation
- [ ] Prompt R&D: in Claude Code (subscription), iterate `prompts/explain-bg.md` on the 5 findings JSONs until output is plain, accurate Bulgarian
- [ ] `explain.ts`: Anthropic SDK, forced tool use, zod
- [ ] `validateExplanation.ts` + tests (fake ID → reject, invented "73%" → reject, valid → pass)
- [ ] Retry-once + fallback path + test
- [ ] Wire into `/api/audit`
**Output:** CLI prints validated Bulgarian explanation for 5 sites
**If behind, cut:** business-type tailoring (one generic prompt)
**⛔ Checkpoint:** if F1+F2 not end-to-end by tonight → drop to 5 checks, don't extend the week

## Day 4 · Sun Nov 1 (2h) — shareable report
- [ ] `store.ts` (Upstash, 90-day TTL); `/api/audit` returns real id
- [ ] `/r/[id]` report: score, headline, problem cards, pass/fail list, CTA
- [ ] Input page: step-by-step loading state ("Проверяваме скоростта…", "Търсим бутон за обаждане…", "Пишем доклада…")
- [ ] Playwright screenshot at 390px, reviewed
**Output:** paste URL on live site → shareable link opens on phone
**If behind, cut:** score gauge → plain number; no animations

## Day 5 · Mon Nov 2 (1.5h) — harden + real users
- [ ] `ratelimit.ts` (5/h/IP + daily cap) + Bulgarian error messages
- [ ] Error states: blocked fetch, timeout, Facebook-only/no site → "не можем да проверим този сайт"
- [ ] **Daniel:** manually verify every claim in the 5 real reports (0 invented findings)
- [ ] **Daniel:** send 3 reports to real prospects (Viber/IG/in person); log replies
**Output:** production-ready + first real feedback
**If behind, cut:** landing page polish

## Day 6 · Tue Nov 3 (1.5h) — BUFFER
- [ ] Finish anything slipped
- [ ] Only if everything above is done: OG image for Viber link previews (`next/og`)

## Day 7 · Wed Nov 4 (1h) — publish (ships regardless)
- [ ] README final (GIF, live link, what I learned)
- [ ] 60s video (use a client's pre-redesign site with permission or own old site — never shame a random business)
- [ ] LinkedIn/Instagram post
- [ ] Update POTW log entry → status: Shipped
