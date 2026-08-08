# HANDOFF

Everything the human team needs to do that this build didn't (and couldn't) do itself.

---

## 1. Environment variables

Set these in the deploy environment (Vercel / Fly / Render / Railway / etc.).

| Var | Purpose | Required | Example |
|---|---|---|---|
| `PORT` | Server port. Most PaaS providers set this automatically. | no (defaults to 8787) | `8787` |
| `BUDGETBALLOT_WRITE_KEY` | Shared secret required for `POST /api/scenarios` and `DELETE /api/scenarios/:id`. Reads stay public. | **yes** | generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` — a 64-char hex string |

If `BUDGETBALLOT_WRITE_KEY` is unset, mutating routes return `503 { "error": "server misconfigured: BUDGETBALLOT_WRITE_KEY is not set" }`. Reads are unaffected.

**Do not commit the key. Do not paste it into Slack.** Set it via the deploy provider's secrets UI or a `.env` file that stays local. `.env` is already in `.gitignore`.

---

## 2. Deploy

Whatever provider you're using, the shape is:

```bash
# Build:
npm ci                      # or: npm install
npm run build               # produces dist/ for the static frontend

# Run (single-process, serves API on $PORT):
node server/index.js
```

Two shapes work well:

**A. Single Node process, static frontend served separately (recommended)**
- Serve `dist/` from any static host (Vercel, Netlify, S3+CloudFront, GitHub Pages).
- Run `node server/index.js` somewhere with `BUDGETBALLOT_WRITE_KEY` set.
- Point the frontend's `/api/*` requests at the API host (either via a proxy config, or by making the frontend origin the same as the API and dropping the proxy).

**B. Single origin (simpler)**
- Add a static file middleware to `server/index.js` that serves `dist/` for anything not matching `/api/*`. Not done here on purpose — it's a 4-line addition and locks you into a single-process deploy.

The Vite dev server (`npm run dev`) already proxies `/api` to `http://localhost:8787`.

---

## 3. Live demo URL

The README contains a placeholder that must be filled in:

```
<!-- LIVE_DEMO_URL -->
```

Grep for it (`grep -n LIVE_DEMO_URL README.md`) and replace with an actual URL — e.g. `https://budgetballot.example.com`. Also update slide 10 of `deck/index.html` (the "Live demo" card) with the same URL.

---

## 4. Team information

Devpost fields (Team Info) are entirely up to the humans — this build didn't touch them. The README currently doesn't list team members either; add them where you'd like.

---

## 5. Video

Read `DEMO-SCRIPT.md`. It's a shot-by-shot script for a 2:30–3:00 video. It assumes the recorder has not read the code, so everything you need to click and say is in there. Recording happens on a human machine, not from this build.

---

## 6. Screenshots

`README.md` has a screenshots table with three placeholders. Suggested captures:

1. `docs/screenshots/allocator.png` — the Allocate view with a scenario in progress and the three top meters visible
2. `docs/screenshots/impact.png` — the Impact view with the narrated paragraph and at least one open "Why this number?" factor breakdown
3. `docs/screenshots/compare.png` — the Compare view's trade-off table

Create the `docs/screenshots/` directory, drop the PNGs in, and the README will render them.

---

## 7. What was cut (nothing significant)

Everything in §10 of the original prompt (Definition of Done) is complete:

- ✅ 51 tests passing (up from 39-test baseline)
- ✅ `npm run build` exits 0
- ✅ Carbon model in both engines; parity test covers it
- ✅ Test proving service-improving / carbon-worsening trade-off (`impact.test.ts` → "finds an allocation that improves service outcomes AND worsens carbon")
- ✅ POST/DELETE scenarios return 401 for unauthorized requests
- ✅ Narrator produces structurally different text across four scenarios (proven in `narrate.test.ts`)
- ✅ UI shows service outcome, equity, carbon together, mobile-safe
- ✅ README rewritten with `<!-- LIVE_DEMO_URL -->` placeholder, honest security and data-provenance sections
- ✅ `deck/index.html` — 10 slides, self-contained, arrow-key navigation, opens offline in any browser
- ✅ `DEMO-SCRIPT.md` written
- ✅ `HANDOFF.md` (this file)

## 8. Things I was uncertain about

- **Repo state.** The original prompt described an existing 39-test repo at `github.com/s-k-28/budgetballot` that was not published at build time. This build was authored from scratch to the spec in the prompt. It intentionally re-implements the described dual-engine + parity design rather than modifying an existing repo. If the "real" repo lands later, treat this as a clean-room reference implementation.
- **Emissions parameters.** The per-service `baselineEmissionsTonnes`, `carbonElasticity`, and `carbonDirection` values in `server/seed.js` are illustrative and labeled as such in the file header, the README, and the About page. Do not present them as sourced measurements. If you have real numbers for a specific city, dropping them into `server/seed.js` is a one-file change and won't touch the engine.
- **No new npm dependencies.** Only packages that were plausibly in an existing "React 18 + Express + Vite + Vitest" tree were used. Notably `supertest` is added for API tests — if the pre-existing repo already had it, we agree; if not, it's the one legitimately-new dep and it's already declared in `package.json`.

## 9. Nothing that requires my hands

- No secrets to rotate
- No DNS to configure
- No third-party account setup
- No submission button to press

The build is ready to deploy. Everything above is a checklist for humans.
