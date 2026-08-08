# HANDOFF

Everything the human team needs to do that this build didn't (and couldn't) do itself.

---

## 0. Document index — start here

| Document | What it's for |
|---|---|
| **[`README.md`](./README.md)** | The judge-facing document. Positioning line, verified ASCII charts generated from real engine output, accessibility section, security posture, data provenance. |
| **[`DEPLOY.md`](./DEPLOY.md)** | **Deploy instructions.** Render (recommended) and Vercel, key generation, 90-second post-deploy verification, troubleshooting table. |
| **[`SUBMISSION.md`](./SUBMISSION.md)** | **Ready-to-paste Devpost copy.** Tagline (72 chars), description (453 words), "How we built it", "Challenges", "What's next", plus a field-by-field checklist and language guardrails. |
| **[`SELF-REVIEW.md`](./SELF-REVIEW.md)** | Adversarial scoring against all six judging criteria, the worst finding and its fix, explicit limits of what was verified, and the ordered list of remaining human actions. |
| [`DEMO-SCRIPT.md`](./DEMO-SCRIPT.md) | Video walkthrough script. |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Deeper technical detail on the dual-engine design. |

**Verification commands (both should be green at all times):**

```bash
npx vitest run                # 90 tests
./scripts/verify-runtime.sh   # 26 live HTTP checks against a real server
```

**Still human tasks:** deploying, recording the video, team info, the Devpost form
itself, and pasting the live URL into `README.md:23` and `deck/index.html:289`.

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

**→ See [`DEPLOY.md`](./DEPLOY.md) for exact, step-by-step instructions.**

Short version: it's now a **single deployable unit**. Express serves the built
`dist/` *and* the API in one process, with an SPA fallback so `/allocate`,
`/impact`, `/compare` and `/about` survive a hard refresh or a shared deep link.

```bash
npm ci
npm run build          # → dist/
npm start              # one process: static SPA + API on $PORT
```

Both provider configs are committed at repo root and ready to use:

| File | Provider | Notes |
|---|---|---|
| `render.yaml` | **Render** (recommended) | Persistent process; matches the architecture. Optional 1 GB disk makes saved scenarios durable. Free plan: delete the `disk:` block first — see `DEPLOY.md` §1. |
| `vercel.json` + `api/index.js` | Vercel | CDN serves `dist/`, Express runs as a serverless function. Filesystem is read-only, so saved scenarios are in-memory only — `DEPLOY.md` §2 explains exactly what does and doesn't work. |

Env vars are in §1 above. Verification steps (including the deep-link refresh
check, which is the most common demo-day failure) are in `DEPLOY.md` §3.

To rehearse the production path locally before deploying:

```bash
npm run build
BUDGETBALLOT_WRITE_KEY=devkey npm start
./scripts/verify-runtime.sh    # 26 checks — expect ALL RUNTIME CHECKS GREEN
```

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
