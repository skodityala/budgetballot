# SUBMISSION.md — ready-to-paste Devpost copy

Everything below is final text. Copy each block into the matching Devpost field.
Nothing here needs editing except the live URL once deploy is done.

---

## 1. Tagline (under 120 characters)

```
Every other entry uses AI to decide for you. BudgetBallot shows you why.
```

_(71 characters.)_

**Backup option, if a more literal tagline is wanted:**

```
Allocate your city's budget. See the impact on services, equity, and carbon — with every factor shown.
```

_(101 characters.)_

---

## 2. Project Description (300–500 words)

```
Every other entry uses AI to decide for you. BudgetBallot shows you why.

Cities decide where hundreds of millions of dollars go every year, and the
reasoning behind those decisions is almost never legible to the people who live
with the consequences. Public hearings present a finished budget. There is no way
for a resident to ask the obvious question: what would happen if we spent it
differently?

BudgetBallot answers that. It is a participatory budgeting simulator for a
mid-size city — 250,000 residents, a $1.2B general fund, twelve services. You
move a slider, and three numbers move together: the projected outcome for that
service, a city-wide equity score, and annual carbon emissions in tonnes of CO2e.
Then it writes you a paragraph in plain language explaining what you just did and
what it cost.

The differentiator is that nothing here is generated. The explanation paragraph is
computed from the model output by a deterministic template engine — same
allocation in, same paragraph out, forever. It cannot hallucinate, because there
is no language model in the pipeline. That is the selling point, not a limitation:
a civic tool that invents a number is worse than no tool at all. Every impact
figure decomposes into the factors that produced it, and the UI renders that
breakdown inline. Click any number and you see the baseline, the funding delta,
the elasticity, and the arithmetic.

The model is honest about trade-offs rather than optimizing them away. Funding
transit reduces emissions because buses displace car trips; funding road expansion
increases them. Those are the two largest emitters in the dataset and they pull in
opposite directions, so there is no allocation that maximizes everything. The
sharpest result the tool produces: cutting every service by 25% saves $300M, costs
18.8 points of equity, and *increases* emissions by 8,631 tonnes — because the
services that reduce emissions got cut too. That is a counterintuitive finding a
resident can discover in about fifteen seconds of sliding.

It is built as a React 18 + TypeScript client with an Express API, and the impact
engine is deliberately implemented twice — once in TypeScript for instant local
slider feedback, once in JavaScript on the server — with an automated parity test
proving the two agree across baseline, extreme, and randomized allocations. Four
runtime dependencies, 63.6 KB gzipped, no chart library, no LLM SDK, no API keys.
90 automated tests plus 26 live HTTP checks against a running server.

Accessibility was treated as a feature: WCAG 2.1 AA target, keyboard-operable
sliders that announce dollar amounts rather than raw numbers, live regions so
screen readers hear updated totals, and no information conveyed by color alone.

Next: real municipal datasets, per-district equity, and multi-year budgets.
```

_(≈430 words.)_

---

## 3. Built with

```
react, typescript, vite, tailwindcss, express, nodejs, react-router, vitest, supertest, javascript, css, html
```

---

## 4. Theme

```
Smart Cities & Sustainability
```

---

## 5. "How we built it"

```
The core design decision was to implement the impact engine twice. The client
needs to recompute twelve service outcomes, an equity score, and a carbon figure
on every slider drag — a network round-trip per keystroke would feel broken. So
the TypeScript engine in src/engine/impact.ts runs locally in the browser. But an
API that only serves static data is not a real API, so the same math also exists
in JavaScript at server/engine.js, exposed as POST /api/impact for third-party
tools and for scenario persistence.

Two implementations of the same math is a liability unless you prove they agree,
so src/engine/parity.test.ts feeds both engines identical allocations — the
baseline, deliberate extremes like zero-funding and 3x-funding, and twelve
pseudo-random allocations from a seeded generator — and asserts the outputs match
exactly. That test is the reason it was safe to keep refactoring the model: any
drift between client and server fails CI immediately. It doubles as executable
documentation of the contract between them.

Everything else follows from wanting the numbers to be inspectable. Each impact
value carries a Factor[] array — label, value, and a human-readable note — that
the UI renders in a collapsible "Why this number?" panel. The narrator consumes
the same computed report and fills templates, so the prose and the numbers can
never disagree. In production the whole thing collapses to one process: Express
serves the built client and the API together, with an SPA fallback so deep links
survive a refresh.
```

---

## 6. "Challenges we ran into"

```
The carbon model's sign convention caused the most trouble. Funding a service more
does not move emissions in a consistent direction: more transit funding lowers
total emissions because bus-miles displace car-miles, while more road funding
raises them. Encoding that as a per-service carbonDirection of reduces, increases,
or neutral was straightforward; keeping the arithmetic correct through the
elasticity calculation was not. An early version had the sign inverted for
"reduces" services, which produced the confidently wrong claim that funding
transit would raise emissions. It now has a dedicated behavioral test: at +25%
funding, every "reduces" service must show a negative delta, every "increases"
service a positive one, and every "neutral" service exactly zero — asserted
against a live server, not just in unit tests.

Auth and rate limiting took longer than expected because the right answer was
asymmetric rather than uniform. This is a civic transparency tool, so reads must
stay public — the dataset, the impact endpoint, and saved scenarios are all meant
to be shareable without a key. Only writes are gated, by a shared secret compared
in near-constant time, behind a per-IP token bucket of twenty writes per minute.
Getting the failure modes right mattered as much as the happy path: a missing key
returns 503 rather than pretending to work, invalid input returns a 400 with a
JSON body instead of a stack trace, and a corrupt scenarios file is quarantined
and reseeded rather than crashing the server.

The last one was self-inflicted and worth admitting: the accessibility contrast
audit found that the accent color failed WCAG AA at 3.03:1, which meant the
primary call-to-action button had been unreadable for low-vision users the entire
time. Eyeballing contrast does not work. Measuring it does.
```

---

## 7. "What's next"

```
Real datasets, real cities. The engine is dataset-agnostic — the twelve services
in server/seed.js are realistic illustrations, not sourced measurements, and a
real municipality could substitute an actual budget with peer-reviewed emissions
factors without touching the model. That is the difference between a demo and a
tool a city council could use.

Per-district equity. The equity score is currently a single city-wide weighted
number. Real budget fights are distributional and geographic, so the next version
projects outcomes per district and shows who specifically gains and loses.

Multi-year budgets. Capital projects pay off over a decade; a single-year
snapshot understates the case for retrofits and transit. Adding time means
discounting and cumulative emissions.

Publisher mode. A shareable read-only permalink per scenario, server-rendering
the narrated paragraph so a resident can post "here is my budget and here is
what it costs" to a council meeting or social media.

Certified accessibility. The WCAG 2.1 AA work is hand-verified against the
success criteria, not audited. Next is a real-hardware screen-reader pass with
VoiceOver, NVDA, and JAWS, plus axe-core in CI.

Federated write auth. Replace the shared-secret key with OIDC or municipal SSO
so a city could run this with real resident accounts and an audit log.
```

---

## Field-by-field checklist for the human filling the form

| Devpost field | Source |
|---|---|
| Project name | `BudgetBallot` |
| Tagline | §1 above |
| Description | §2 above |
| Built with | §3 above |
| Theme / category | §4 — Smart Cities & Sustainability |
| "How we built it" | §5 above |
| "Challenges" | §6 above |
| "What's next" | §7 above |
| Try it out link | the deployed URL (see `DEPLOY.md`) |
| Repository link | the GitHub repo URL |
| Video demo | see `DEMO-SCRIPT.md` |

**Language guardrails — do not add:**

- No "AI-powered", "AI-driven", "intelligent", "smart recommendations". The
  narrator is deterministic and that is the selling point.
- If asked whether it uses AI, the honest answer is: **no language model is in the
  pipeline. The explanation is computed, not generated — it cannot hallucinate.**
- Do not present the emissions figures as sourced measurements. They are
  illustrative parameters chosen for plausible magnitude and correct direction.
  `README.md` says so explicitly and the submission should not contradict it.
