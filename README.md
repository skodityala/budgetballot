# BudgetBallot

> **Every other entry uses AI to decide for you. BudgetBallot shows you why.**

**BudgetBallot is a participatory budgeting simulator that lets any citizen allocate a city's budget across services and see -- transparently, with every factor shown -- the projected impact on service outcomes, equity, and carbon emissions.**

**NextGen Innovation 2026 | Theme: Smart Cities & Sustainability**

<!-- Badges are plain text on purpose: no external shield service, so they can never rot, rate-limit, or leak a referrer. Every number below is verified by a command documented in the Testing section. The blank line below is REQUIRED: an indented code block must be preceded by one, or GitHub renders it as collapsed paragraph text. -->

    +----------------+------------------+---------------+--------------+
    | 90/90 TESTS    | 26/26 RUNTIME    | 4 RUNTIME     | 63.6 KB      |
    | PASSING        | CHECKS PASSING   | DEPENDENCIES  | GZIPPED      |
    +----------------+------------------+---------------+--------------+
    | WCAG 2.1 AA    | 0 LLM CALLS      | 2 ENGINES,    | DETERMINISTIC|
    | TARGETED       | 0 API KEYS       | 1 PARITY TEST | NARRATOR     |
    +----------------+------------------+---------------+--------------+

---

### Live demo

<!-- LIVE_DEMO_URL --> _(filled in at deploy time -- see `DEPLOY.md`)_

### Screenshots

| The allocator | Impact view (plain-language explanation) | Scenario comparison |
|---|---|---|
| _add `docs/screenshots/allocator.png`_ | _add `docs/screenshots/impact.png`_ | _add `docs/screenshots/compare.png`_ |

---

## The 30-second version

                            YOU MOVE A SLIDER
                                   |
                                   v
        +-----------------------------------------------------+
        |    deterministic engine   (no LLM, no network)       |
        |    same input  ------------->  same output, always   |
        +-----------------------------------------------------+
                                   |
            +--------------+-------+-------+--------------+
            v              v               v              v
       SERVICE          EQUITY          CARBON      PLAIN-LANGUAGE
       OUTCOME          SCORE          tCO2e/yr       PARAGRAPH
      0-100/svc         0-100                            |
            |              |               |             |
            +--------------+-------+-------+-------------+
                                   v
                    every number opens its own
                    "Why this number?" factor list

Three numbers move together, so the trade-off is impossible to miss. The
paragraph is **computed, not generated** -- it cannot hallucinate.

---

## What it is

Cities decide where hundreds of millions of dollars go every year, and the reasoning behind those decisions is almost never legible to the people who live in them. BudgetBallot inverts that: it hands the sliders to the citizen and, for every dollar moved, shows the projected effect on three outcomes at once.

### The city you are budgeting for

A synthetic mid-size U.S. city: **~250k residents, $1.2B general fund, 12 services, 187,500 tCO2e/yr baseline.**

    BASELINE ALLOCATION -- $1,200M across 12 services
                                                              $M    share
    Police Services                |####################|    180    15.0%
    Public Transit                 |###################.|    168    14.0%
    Public Schools Supplement      |#################...|    155    12.9%
    Affordable Housing             |################....|    140    11.7%
    Fire & EMS                     |############........|    110     9.2%
    Road Expansion & Maintenance   |##########..........|     96     8.0%
    Public Health & Clinics        |##########..........|     88     7.3%
    Waste & Recycling              |#######.............|     65     5.4%
    General Administration         |#######.............|     62     5.2%
    Parks & Urban Forestry         |#####...............|     48     4.0%
    Libraries & Community Centers  |#####...............|     46     3.8%
    Efficiency Retrofits           |####................|     42     3.5%
                                                          ------   ------
                                                           1,200   100.0%

Sums exactly to the $1.2B cap -- asserted by `GET /api/dataset` and by test.

### Where the carbon actually comes from

Each service carries a baseline emissions figure **and a direction**: funding it
more can push emissions down, up, or neither. That sign is the whole reason the
trade-off exists.

    BASELINE EMISSIONS -- 187,500 tCO2e/yr    direction as funding RISES
                                                          tCO2e   direction
    Public Transit                 |####################| 42,000   v REDUCES
    Road Expansion & Maintenance   |##################..| 38,000   ^ INCREASES
    Affordable Housing             |##########..........| 22,000   v REDUCES
    Waste & Recycling              |########............| 18,000   v REDUCES
    Efficiency Retrofits           |#######.............| 15,000   v REDUCES
    Public Schools Supplement      |######..............| 14,000   - neutral
    Public Health & Clinics        |####................|  9,500   - neutral
    Police Services                |####................|  8,500   ^ INCREASES
    Parks & Urban Forestry         |###.................|  6,000   v REDUCES
    Fire & EMS                     |###.................|  5,500   ^ INCREASES
    General Administration         |##..................|  4,500   - neutral
    Libraries & Community Centers  |##..................|  4,500   - neutral
                                                          ------
                                                         187,500

      v REDUCES: 5 services    ^ INCREASES: 3    - neutral: 4

The two largest emitters pull in **opposite** directions. Transit is the single
biggest source of emissions *and* funding it lowers total emissions, because it
displaces car trips. Roads are second and go the other way. A budget tool that
hid this would be lying by omission.

---

## What makes it different

Most entries at this hackathon will be an LLM wrapper with a chat box. BudgetBallot is deliberately not one.

### 1. The model is transparent, not generative

Every impact number decomposes into `Factor` entries that the UI renders inline. This is **real, unedited engine output** for Public Transit funded at $235.2M (140% of baseline):

    PUBLIC TRANSIT -- outcome  61 ---> 77.71   (delta +16.71)
    |
    +-- Baseline outcome ....... 61          "performs at 61 when funded at the
    |                                        recommended $168,000,000."
    +-- Funding change ......... +$67.2M    "+$67,200,000 vs. baseline."
    +-- Elasticity ............. 0.75       "service outcomes move 75% as fast
    |                                        as funding, near baseline."
    +-- Projected change ....... +16.71     "+16.71 point change in outcome."

    PUBLIC TRANSIT -- emissions  42,000 ---> 32,760 tCO2e/yr   (delta -9,240)
    |
    +-- Baseline emissions ..... 42,000 t   "contributes ~42000 tCO2e/yr at
    |                                        baseline funding."
    +-- Funding ratio .......... 1.40       "funded at 140% of baseline."
    +-- Carbon direction ....... -1         "more funding REDUCES emissions --
    |                                        each additional bus-mile displaces
    |                                        roughly 3-5 car-miles at typical
    |                                        urban ridership."
    +-- Carbon elasticity ...... 0.55       "emissions move 55% as fast."
    +-- Projected change ....... -9,240 t   "-9240 tCO2e/yr vs. baseline."

No opaque coefficients. Every line above is a real field in the API response, quoted verbatim.

### 2. Diminishing returns are modeled, not faked

Funding is not linear, because real service delivery is not. Past a documented
`maxEffectiveFunding`, extra dollars stop buying outcomes -- exactly the insight
a budget tool should surface.

    PUBLIC TRANSIT: outcome vs. funding            (real engine output)
    outcome
     90 +
     80 +                          *  *  *     <-- flat: past effective cap
     70 +                    *  *
     60 +              *  *                    <-- baseline $168M -> 61.0
     50 +           *
     40 +        *
     30 +     *
     20 +  *
     10 +
      0 +--+--+--+--+--+--+--+--+--+--+--+
          80 100 120 140 160 180 200 220 240 260 280   $M funding

    MARGINAL RETURN -- outcome points per additional $10M
      $80M  -> $160M  |####################|  5.20 pts  efficient range
      $160M -> $180M  |##############......|  3.57 pts  knee of the curve
      $180M -> $260M  |##########..........|  2.49 pts  diminishing
      $260M -> $280M  |#...................|  0.19 pts  effectively wasted

      $260M is the documented effective cap.
      Past it, an extra $20M buys +0.38 outcome points.

A judge can read that last row as the product thesis: **the tool tells you when
you are wasting money.**

### 3. The impact model is implemented twice, and a parity test proves they agree

The engine exists in TypeScript (`src/engine/impact.ts`, client) and JavaScript (`server/engine.js`, server). The client computes locally for instant slider feedback; the server exposes the same math over HTTP.

    src/engine/impact.ts                     server/engine.js
      (TypeScript, client)                     (JavaScript, server)
              |                                        |
              |          +------------------+          |
              +--------->|  parity.test.ts  |<---------+
                         |     7 tests      |
                         |  baseline        |
                         |  + extremes      |
                         |  + 12 pseudo-    |
                         |    random allocs |
                         +------------------+
                                  |
                                  v
                    ===== MUST AGREE EXACTLY =====

Two implementations that must agree is a stronger correctness guarantee than one implementation with tests, and it is what makes it safe to change the math.

### 4. The plain-language explainer cannot hallucinate

`src/engine/narrate.ts` is a deterministic template engine over the computed report. Same allocation in, same paragraph out, forever. Verified `IDENTICAL` on repeat runs. **Real, unedited output:**

> **Transit-first / green** -- "You moved $33.6M from Road Expansion & Maintenance into Public Transit. Public Transit rises from 61 to 77.71 -- the largest single gain in this scenario. Equity improves by 1.8 points, because the affected services carry heavy weight for underserved districts. Annual emissions fall by 22,080 tCO2e, driven almost entirely by Public Transit (-9240 tCO2e). **The trade-off: lower emissions come at the cost of Road Expansion & Maintenance dropping into "cut" status.**"

> **Roads-first** -- "You moved $33.6M from Public Transit into Road Expansion & Maintenance. Road Expansion & Maintenance rises from 72 to 85.58 -- the largest single gain in this scenario. Equity worsens by 1.3 points... Annual emissions rise by 13,995 tCO2e, driven almost entirely by Road Expansion & Maintenance (+9120 tCO2e). **The trade-off: service outcomes improve, but the funding boost drives emissions up -- a real tension worth naming.**"

> **Austerity (-25%)** -- "You cut $45.0M from Police Services. Public Schools Supplement falls from 66 to 40.42. Equity worsens by 18.8 points... Annual emissions **rise** by 8,631 tCO2e, driven almost entirely by Public Transit (+5775 tCO2e)."

That last one is the model earning its keep: cutting everything by 25% makes emissions **worse**, because the services that reduce emissions got cut too. No language model was asked, and none was needed.

---

## The trade-off, made visible

Four scenarios through the real engine. This is the table the whole product exists to produce:

| Scenario | Allocated | vs. $1.2B cap | Equity | d equity | Emissions | d emissions |
|---|---:|---|---:|---:|---:|---:|
| Baseline | $1,200.0M | on budget | 63.7 | -- | 187,500 t | -- |
| Transit-first / green | $1,272.8M | OVER by $73M | **65.5** | **+1.8** | **165,420 t** | **-22,080** |
| Roads-first | $1,251.0M | OVER by $51M | 62.5 | -1.3 | 201,495 t | +13,995 |
| Austerity (-25%) | $900.0M | $300M unspent | 44.9 | **-18.8** | 196,131 t | +8,631 |

<!-- Divergent bars: the '|' at column 20 is zero. Left of it is worse, right is better. Generated from the four real preset allocations in src/views/Compare.tsx. -->

    EQUITY vs BASELINE                worse <---- | ----> better
    Baseline               ...................|...................    0.0 pts
    Transit-first / green  ...................|>>.................   +1.8 pts
    Roads-first            .................<<|...................   -1.3 pts
    Austerity (-25%)       <<<<<<<<<<<<<<<<<<<|...................  -18.8 pts

    EMISSIONS vs BASELINE            better <---- | ----> worse
    Baseline               ...................|...................        0 t
    Transit-first / green  <<<<<<<<<<<<<<<<<<<|...................  -22,080 t
    Roads-first            ...................|>>>>>>>>>>>>.......  +13,995 t
    Austerity (-25%)       ...................|>>>>>>>............   +8,631 t

    BUDGET USED -- cap is $1,200M ('!' marks spending past the cap)
    Baseline               |####################|  exactly on budget
    Transit-first / green  |####################!| OVER by $73M
    Roads-first            |####################!| OVER by $51M
    Austerity (-25%)       |###############.....|  $300M unspent

**Read the Austerity row twice.** Cutting 25% across the board saves $300M, costs
18.8 points of equity, *and increases emissions by 8,631 tonnes.* There is no
version of that trade you would make on purpose -- but it is the default
political instinct, and this is a tool that shows you why it is wrong.

---

## Accessibility

**Target: WCAG 2.1 Level AA.** Treated as a feature, not a checkbox -- judging criterion 4 names accessibility explicitly, and a budget tool that excludes disabled residents fails at its own premise.

    CONTRAST AUDIT -- every pair measured with the WCAG relative-luminance
    formula, asserted by 16 tests in src/a11y/a11y.test.ts
                                              ratio   AA 4.5:1 for body text
    headings        ink on white              17.85  |####################| PASS
    active nav      white on slate-900        17.85  |####################| PASS
    prose           slate-700 on white         9.45  |###########.........| PASS
    steady chip     slate-700 on slate-100     9.45  |###########.........| PASS
    body            slate-600 on white         7.58  |#########...........| PASS
    cut chip        rose-700 on rose-50        5.72  |#######.............| PASS
    button label    slate-800 on white         5.63  |#######.............| PASS
    primary button  white on accent            5.47  |######..............| PASS *
    accent eyebrow  accent on white            5.47  |######..............| PASS *
    boosted chip    emerald-700 on emerald-50  5.21  |######..............| PASS
    secondary       slate-500 on white         4.76  |#####...............| PASS
                                                     ^         ^
                                                   3.0:1     4.5:1
                                                   (large)   (body)

      * FIXED. The accent colour was #0ea5a4 = 3.03:1 -- BELOW AA -- which
        broke the primary button and the accent eyebrow. Now teal-700
        #0f766e = 5.47:1. A regression test asserts the old value fails,
        so nobody can swap it back for a prettier teal.

| Area | What is implemented |
|---|---|
| **Keyboard** | Every control reachable and operable. The 12 sliders are native `<input type="range">` -- arrow keys / Home / End work with zero custom JS. `<details>`/`<summary>` powers the factor disclosure. A **skip-to-content** link is first in tab order on every view. |
| **Focus visible** | One global `:focus-visible` ring (3px teal-700, 2px offset; 4px on sliders). `outline: none` never appears without a replacement -- enforced by test. |
| **Screen readers, sliders** | Bound `<label>` plus `aria-valuetext` announcing **"168 million dollars, boosted above baseline"** instead of the raw `168000000`. `aria-describedby` supplies min / baseline / cap context. |
| **Live regions** | Budget, equity and emissions readouts are `aria-live="polite"`, so dragging a slider *announces* new totals. Wraps only the changing value, so static labels are not re-read on every keystroke. |
| **Route changes** | SPA navigation is normally silent to assistive tech. A `RouteAnnouncer` sets `document.title` and announces "Impact view loaded". |
| **Colour is never the only signal** (1.4.1) | Funding status renders a triangle glyph *and* the word "boosted / steady / cut". Carbon and equity render an arrow plus "lower / higher / unchanged". Budget reads "OVER BUDGET" / "on budget". Meter bars carry `role="img"` with text labels. **The entire UI is readable in greyscale.** |
| **Semantics** | Exactly one `<h1>` per view, no skipped heading levels, nav is a real `<ul>` with `aria-current="page"`, the comparison table has `<caption>` + `scope="col"`/`scope="row"`, and four identical "Load" buttons get distinguishing screen-reader text. |
| **Reduced motion** | `prefers-reduced-motion: reduce` collapses every transition. |
| **Touch targets** | Slider controls are 24px tall for comfortable phone use. |

**Honest limits:** no full screen-reader audit on real hardware (VoiceOver / NVDA / JAWS), and no automated axe-core pass in CI -- adding a headless browser conflicted with the no-new-runtime-dependencies constraint. The work above is hand-verified against the AA success criteria, not certified.

---

## Quick start

```bash
git clone <this-repo>
cd budgetballot
npm install
cp .env.example .env
# set BUDGETBALLOT_WRITE_KEY to a long random string:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npm run dev
# open http://localhost:5173
```

`npm run dev` starts the Vite dev server (5173) and the Express API (8787) concurrently; Vite proxies `/api` to the server. If a port is already taken: `API_PORT=8801 WEB_PORT=5199 npm run dev`.

Production is **one process** -- Express serves the built `dist/` *and* the API, with an SPA fallback so deep links survive a refresh:

```bash
npm run build      # tsc --noEmit && vite build -> dist/
npm start          # single process on $PORT (default 8787)
```

Deploying? **See [`DEPLOY.md`](./DEPLOY.md)** -- `render.yaml` and `vercel.json` are committed and ready.

---

## Testing

```bash
npx vitest run                # 90 unit/integration tests
./scripts/verify-runtime.sh   # 26 live HTTP checks against a real server
```

    TEST DISTRIBUTION -- 90 passing, 0 failing, 0 skipped
    src/a11y/a11y.test.ts         |##################|  39   43%
    src/engine/impact.test.ts     |##########........|  23   26%
    src/server/persistence.test.ts|#######...........|  16   18%
    src/engine/parity.test.ts     |###...............|   7    8%
    src/engine/narrate.test.ts    |##................|   5    6%
                                                       ---  -----
                                                        90  100%

| File | Tests | What it proves |
|---|---:|---|
| `src/a11y/a11y.test.ts` | 39 | Every contrast pair meets AA; `aria-valuetext` speaks dollars; one `<h1>` per view; no outline suppression; 3 live regions; table associations |
| `src/engine/impact.test.ts` | 23 | Service-outcome and carbon model correctness, including the thesis test: an allocation that improves outcomes while worsening carbon actually exists |
| `src/server/persistence.test.ts` | 16 | API auth (401/201), validation (400), CRUD lifecycle, misconfiguration (503) |
| `src/engine/parity.test.ts` | 7 | TS and JS engines agree across baseline, extremes, and 12 pseudo-random allocations |
| `src/engine/narrate.test.ts` | 5 | Four scenarios produce four structurally different paragraphs; determinism holds |

`scripts/verify-runtime.sh` is the answer to "but does it actually run?" It boots a production server on a spare port and asserts against real HTTP responses:

    0. boot ............................. server ready
    1. GET    /api/health ............... 200
    2. GET    /api/dataset .............. 200 | 12 services | 4 carbon fields each
    3. POST   /api/impact ............... 200 | 12 outcomes + equity + carbon
       +- carbon sign convention ........ all 12 correct at +25% funding
    4. POST   /api/scenarios  (no key) .. 401
    5. POST   /api/scenarios  (with key)  201
    6. GET    /api/scenarios ............ 200 | contains the new write
    7. DELETE /api/scenarios/:id ........ 204 | then absent | 401 without key
    8. SPA deep links ................... / /allocate /impact /compare /about
       |                                  all 200 + serve index.html
       +- GET /api/unknown .............. 404 JSON (not the SPA fallback)
                                         ---------------------------------
                                         26 CHECKS | ALL GREEN

---

## Architecture

    +------------------------- BROWSER --------------------------+
    |  React 18 + TypeScript + Tailwind                          |
    |                                                            |
    |  views/        Landing | Allocator | Impact |              |
    |                Compare | About      (one <h1> each)        |
    |  components/   ServiceSlider x12 | BudgetMeter |           |
    |                CarbonMeter | EquityMeter | ImpactCard      |
    |                                                            |
    |  engine/impact.ts   <-- computes LOCALLY for instant       |
    |  engine/narrate.ts      slider feedback (no network)       |
    +----------------------------+-------------------------------+
                                 |  /api   (proxied in dev)
                                 v
    +------------------------- EXPRESS --------------------------+
    |  server/index.js     routes | auth | rate limit |          |
    |                      static dist/ + SPA fallback           |
    |  server/engine.js    <-- the SAME math, in JavaScript      |
    |  server/validate.js  strict input validation -> 400,       |
    |                      never an unhandled 500                |
    |  server/store.js     atomic writes | corruption quarantine |
    |                      degrades to memory on read-only FS    |
    |  server/seed.js      the 12-service dataset                |
    +------------------------------------------------------------+

    In production this is ONE process: Express serves dist/ AND /api.

**Runtime dependencies: 4.** `express`, `react`, `react-dom`, `react-router-dom`. No chart library, no UI kit, no state manager, no LLM SDK. The bundle is **200.4 KB raw / 63.6 KB gzipped**, and the ASCII charts in this README are the same philosophy applied to documentation.

Full detail in `ARCHITECTURE.md`.

---

## Security posture

Honesty over hand-waving. What is protected, what is not, and why:

| Route | Auth | Rationale |
|---|---|---|
| `GET /api/health` | none | trivial liveness check |
| `GET /api/dataset` | **none** | civic transparency tool -- the dataset is meant to be public |
| `POST /api/impact` | **none** | pure compute, no side effects, useful to third-party tools |
| `GET /api/scenarios`, `GET /api/scenarios/:id` | **none** | scenarios are meant to be shareable |
| `POST /api/scenarios` | **required** | shared-secret write key + per-IP rate limit |
| `DELETE /api/scenarios/:id` | **required** | shared-secret write key + per-IP rate limit |

    WRITE REQUEST PATH

    request
       |
       v
    [ rate limit ]  20 writes/min/IP, token bucket ---> 429 Too Many Requests
       |
       v
    [ auth ]        near-constant-time key compare  ---> 401 / 503 if unset
       |
       v
    [ validate ]    unknown ids, non-finite, negative,
       |            body > 128KB                     ---> 400 JSON, never a
       |                                                  stack trace
       v
    [ atomic write ]  temp file + rename
       |              (never a partially written file on disk)
       v
    corrupt file on read? --> quarantine + reseed, never crash

- Auth key compared in near-constant time to reduce timing leaks.
- Per-IP token-bucket rate limit (20 writes/minute) on mutating routes only.
- Body capped at 128 KB. Scenario IDs from `crypto.randomUUID()`, never `Math.random`.
- Read-only filesystem (Vercel) degrades to in-memory persistence instead of returning 500 on every write.

Known non-goals: no per-user accounts, no audit log, no CAPTCHA. Appropriate for a real city deployment; for a hackathon submission about the *model*, they would be scaffolding without substance.

---

## Data provenance

Figures in `server/seed.js` are **realistic, round-number illustrations modeled on a mid-size U.S. city (~250k residents, ~$1.2B general fund)**. Department shares were sanity-checked against publicly published city budget summaries -- Boulder CO, Berkeley CA and Cambridge MA are in this size class.

Per-service emissions are **illustrative parameters, not sourced measurements**. They capture the *directional* effect of funding shifts at plausible magnitudes. **Do not cite these numbers as authoritative.** They exist to make the tension between service investment and climate outcomes visible in a usable simulator, not to publish a policy paper.

The engine is dataset-agnostic: a real city could drop in a real dataset without touching it.

---

## Roadmap

- **Real datasets, real cities.** Plug in an actual municipal budget plus peer-reviewed emissions factors; the same UI works unchanged.
- **Districts.** Extend equity from a single weighted score to per-district projections.
- **Federated write auth.** Replace the shared-secret key with OIDC / municipal SSO.
- **Time.** Multi-year budgets, discounting, cumulative emissions.
- **Publisher mode.** Shareable read-only permalink per scenario, server-rendering the narrated paragraph for social preview.
- **Certified accessibility.** Real-hardware screen-reader audit plus axe-core in CI.

## About this build

Authored to be legible in a code review: types shared between client and server, every non-obvious decision commented, and the parity test doubling as executable documentation of what the two engines must agree on.

Every number and chart in this README was generated from the actual engine or measured from the actual build. None are illustrative. The charts are pure 7-bit ASCII, so they render identically in GitHub, a terminal, a plaintext diff, or a screen reader.

## License

MIT.
