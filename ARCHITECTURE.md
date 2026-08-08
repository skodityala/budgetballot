# ARCHITECTURE

Short version: **a plain React + Express app with one unusual constraint** — the impact model exists twice, in two languages, and an automated test enforces they agree.

## Request flow

```
 ┌─────────────────────────────────────────┐
 │  Browser (React + TypeScript)           │
 │                                         │
 │   Landing ─┐                            │
 │   Allocate ┼─ useScenario() ── computeImpact() (TS)
 │   Impact  ─┤                    │       │
 │   Compare ─┘                    │       │        ← instant, no round-trip
 │              narrate()  ────────┘       │
 │                                         │
 └──────────────┬──────────────────────────┘
                │  fetch("/api/...")
                ▼
 ┌─────────────────────────────────────────┐
 │  Vite dev proxy  →  Express (port 8787) │
 │                                         │
 │  routes ── validate ── engine.js  ──── computeImpact() (JS)
 │                          ▲              │
 │            store.js ─────┘ (JSON file)  │
 │                                         │
 └─────────────────────────────────────────┘
                │
                ▼
        server/data/scenarios.json
        (gitignored, atomic write-temp+rename,
         rehydrated from seed.js on cold start)
```

## The dual-engine design — and why it exists

`src/engine/impact.ts` and `server/engine.js` implement the same model. Every exported function has the same name, same signature, same math. This lets the browser compute impact instantly as the user drags a slider (no server round-trip) while giving the API a canonical version of the same computation for scripting and validation.

The obvious risk with any duplication is drift. `src/engine/parity.test.ts` is the safety net:

- It runs both implementations against the baseline allocation, extreme values, and 12 deterministic pseudo-random allocations.
- It compares every numeric output field.
- If they disagree by so much as a rounding position, the test fails.

**Rule for future editors:** if you change the math in one file, change it in the other. If the parity test fails, your change is wrong — not the test.

## The impact model

Given a `Dataset` (services + budget) and an `Allocation` (dollars per service), the model produces an `ImpactReport` with three coupled views:

### Service outcomes (0–100 per service)

Piecewise linear response to funding:

```
funding = 0                → outcome = 0
0 < funding < min          → outcome collapses proportionally
min ≤ funding ≤ baseline   → linear ramp using elasticity
baseline < funding ≤ cap   → linear ramp at half slope (diminishing)
funding > cap              → asymptotic (20% of remaining outcome per doubling)
```

Bounded to `[0, 100]`.

### Equity score (0–100)

Weighted average of `projectedOutcome × equityWeight` across services, normalized by total weight. Services important to underserved districts (transit, housing, health, schools) carry ~0.85–0.95; general administration carries 0.30.

### Carbon (metric tons CO₂e / year)

Per-service linear response scaled by a **signed** elasticity:

```
ratio    = funding / baselineFunding
response = (ratio - 1) × carbonElasticity

if direction = "reduces"   →  projected = baseline × (1 - response)
if direction = "increases" →  projected = baseline × (1 + response)
if direction = "neutral"   →  projected = baseline
```

Bounded below at zero.

The sign is the whole point. **Public Transit reduces emissions when funded above baseline** (mode shift away from private vehicles). **Road Expansion increases emissions when funded above baseline** (induced demand). This produces genuine budget-vs-climate trade-offs — proven by `impact.test.ts` in the test named "finds an allocation that improves service outcomes AND worsens carbon."

### Factors — the transparency mechanism

Every computed number carries a `Factor[]` alongside it. A factor is `{ label, value, note? }`. The UI renders these under a "Why this number?" disclosure. This is the whole product — no opaque coefficients, ever. See `src/components/ImpactCard.tsx` and `src/components/ui.tsx#FactorList`.

## The narrator

`src/engine/narrate.ts` is a pure function `ImpactReport → string`. It:

1. Identifies the largest funding shift (up and down).
2. Identifies the largest outcome gain and loss.
3. Identifies the dominant carbon mover.
4. Assembles sentences from a small vocabulary of shapes, chosen by which effect is decisive.
5. Adds a trade-off sentence when service gains coincide with a carbon loss (or vice versa).

No network. No LLM. No API key. It works offline forever. `narrate.test.ts` proves that four different scenarios produce four structurally different paragraphs and that the function is deterministic.

## Data model

```ts
Dataset {
  city, year, population, totalBudget, baselineEmissionsTonnes, notes
  services: Service[]
}

Service {
  id, name, category
  baselineFunding, minFunding, maxEffectiveFunding
  baselineOutcome, elasticity, equityWeight
  baselineEmissionsTonnes, carbonElasticity
  carbonDirection: "reduces" | "increases" | "neutral"
  carbonRationale: string
}

Allocation = { [serviceId]: dollars }
Scenario   = { id, name, createdAt, allocation }
ImpactReport = { totalAllocated, overBudget, services, equity, carbon }
Factor = { label, value, note? }
```

## API surface

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/health` | – | liveness |
| GET | `/api/dataset` | – | services + baseline |
| POST | `/api/impact` | – | pure compute (idempotent) |
| GET | `/api/scenarios` | – | list saved scenarios |
| GET | `/api/scenarios/:id` | – | fetch one |
| POST | `/api/scenarios` | **write key** | create (rate-limited) |
| DELETE | `/api/scenarios/:id` | **write key** | remove (rate-limited) |

Auth header: `Authorization: Bearer <key>` OR `x-write-key: <key>`. See README §Security.

## Persistence

`server/store.js` uses a single JSON file at `server/data/scenarios.json` with:

- Atomic writes (write to `.tmp-<pid>-<ts>` then `rename`).
- In-memory index for O(1) reads.
- Auto-seed on cold start from `server/seed.js` if the file is missing.
- Corruption fallback: bad file quarantined as `.corrupt-<ts>`, reseeded, process continues.
- Cap at 200 scenarios to prevent unbounded growth on a public deploy.

The `server/data/` directory is `.gitignore`'d — the seed is the source of truth.

## Testing philosophy

- **Unit tests** for the math (`impact.test.ts`) — including a test whose whole purpose is proving the product's thesis (a trade-off allocation exists).
- **Parity tests** as regression harness against desync between the two engine implementations.
- **API tests** with `supertest` covering auth, validation, and lifecycle.
- **Narrator tests** proving output determinism and structural variety.

Total: 51 tests across 4 files.
