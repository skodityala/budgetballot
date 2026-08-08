# DEPLOY

Everything needed to put BudgetBallot on the internet. Two supported targets:
**Render** (recommended) and **Vercel**. Both configs are committed at repo root.

**TL;DR — Render:** push to GitHub → New Web Service → pick the repo → paste
`BUDGETBALLOT_WRITE_KEY` → Create. Render reads `render.yaml`. ~4 minutes.

---

## 0. Generate the write key (do this first, either target)

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the 64-character hex string. You'll paste it into the provider's env-var UI.

- It gates **only** `POST /api/scenarios` and `DELETE /api/scenarios/:id`.
- All reads (`/api/health`, `/api/dataset`, `POST /api/impact`, `GET /api/scenarios`)
  are public by design — this is a civic transparency tool.
- If it's unset, reads work fine and writes return
  `503 {"error":"server misconfigured: ..."}`. The demo still functions; the
  "Save scenario" button just won't persist.
- **Never commit it.** `.env` is gitignored. Don't paste it in Slack.

---

## 1. Render (recommended)

Render runs a persistent Node process, which matches how this app is built:
**one** service where Express serves the built `dist/` *and* the API.

1. Push `main` to GitHub.
2. Render dashboard → **New** → **Web Service** → connect the repo.
3. Render auto-detects `render.yaml`. Confirm it shows:
   - Build: `npm ci && npm run build`
   - Start: `npm start`
   - Health check: `/api/health`
4. It will prompt for **`BUDGETBALLOT_WRITE_KEY`** (declared `sync: false`, so
   it is never stored in git). Paste the key from step 0.
5. **Create Web Service.** First build ~3–5 min.

### If you're on Render's free plan

Free services **cannot mount disks**. Before deploying, open `render.yaml` and
delete both:

- the entire `disk:` block at the bottom, and
- the `BUDGETBALLOT_DATA_DIR` env var

The app then keeps scenarios in memory: everything works, but scenarios saved
during the demo won't survive a restart (free instances also sleep after ~15 min
of inactivity — **hit the URL once right before judging** so it's warm).

With a paid plan and the disk left in place, scenarios persist at `/var/data`.

---

## 2. Vercel

Vercel is serverless: the CDN serves `dist/` and `api/index.js` runs the Express
app per-request. `vercel.json` + `api/index.js` are already wired for this.

```bash
npm i -g vercel
vercel                 # first run: link the project, accept detected settings
vercel env add BUDGETBALLOT_WRITE_KEY production   # paste the key from step 0
vercel --prod
```

Or via the dashboard: **Add New → Project → import the repo →** add
`BUDGETBALLOT_WRITE_KEY` under Environment Variables (Production) → **Deploy**.

### The one Vercel caveat — read this

Vercel's filesystem is **read-only** (except `/tmp`, which isn't shared between
invocations). `server/store.js` detects the failed write and degrades to
in-memory persistence instead of erroring — so:

- ✅ The whole UI, the allocator, `/api/impact`, equity and carbon all work.
- ✅ `GET /api/scenarios` returns the seeded baseline scenario.
- ⚠️ A scenario saved via `POST /api/scenarios` returns `201` but **may not be
  visible to a later request**, because the next invocation is a different
  instance with fresh memory.

If the demo video shows saving a scenario and reloading to find it, **use
Render.** If the demo is the allocator → impact → compare flow (it is — see
`DEMO-SCRIPT.md`), Vercel is fine.

---

## 3. Verify the deploy (90 seconds, do not skip)

Replace `$URL` with your deployed origin.

```bash
URL=https://your-app.onrender.com

# 1. API is alive → {"ok":true,...}
curl -s $URL/api/health

# 2. Dataset → 12 services with carbon fields
curl -s $URL/api/dataset | node -e 'let d="";process.stdin.on("data",c=>d+=c).on("end",()=>{const j=JSON.parse(d);console.log(j.services.length+" services, carbon on first:",j.services[0].baselineEmissionsTonnes)})'

# 3. Auth is enforced → 401
curl -s -o /dev/null -w '%{http_code}\n' -X POST $URL/api/scenarios \
  -H 'Content-Type: application/json' -d '{"name":"x","allocation":{}}'

# 4. DEEP LINK REFRESH — the classic demo-day failure. Must be 200, not 404.
for p in / /allocate /impact /compare /about; do
  printf '%-12s %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' $URL$p)"
done
```

**Expected:** `{"ok":true,...}` · `12 services, carbon on first: 42000` · `401` ·
all five paths `200`.

Then in a browser:

1. Open `$URL` → landing page renders, headline visible.
2. Click **Start allocating** → drag a slider → the three meters move together.
3. Go to **Impact** → the narrated paragraph is there, above the fold.
4. **Refresh the page while on `/impact`.** It must reload the Impact view, not
   a 404. ← this is what the SPA fallback exists for.
5. Open DevTools console → no red errors.
6. Narrow the window to ~375 px → layout still usable.

### Local rehearsal of the exact production path

```bash
npm ci && npm run build
BUDGETBALLOT_WRITE_KEY=devkey npm start   # → http://localhost:8787
./scripts/verify-runtime.sh               # 26 automated checks, expect ALL GREEN
```

`scripts/verify-runtime.sh` boots a production server on a spare port and
asserts every endpoint plus deep-link refresh. If it's green locally and the
`curl` checks above are green on the deployed URL, the deploy is good.

---

## 4. After deploying — fill in the URL

The README and deck both carry a placeholder:

```bash
grep -rn "LIVE_DEMO_URL" README.md deck/index.html
```

Replace `<!-- LIVE_DEMO_URL -->` in **`README.md:23`** with the real URL, and
update the live-demo line in **`deck/index.html:289`**. Commit and push — judges
often click the README link before anything else.

---

## 5. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `dist/ not found. Run npm run build` (503 on every page) | Started without building | Ensure build command ran; `npm run build` then restart |
| Deep link `/impact` 404s | Static host serving `dist/` without SPA rewrite | On Render this can't happen (Express handles it). On another static host, add a catch-all rewrite to `/index.html` |
| Writes return 503 | `BUDGETBALLOT_WRITE_KEY` not set | Add it in the provider's env UI and redeploy |
| Writes return 401 | Key mismatch | Client must send `Authorization: Bearer <key>` |
| Saved scenario vanishes | Ephemeral FS (Vercel / diskless Render) | Expected — see §2. Use Render + disk for durability |
| `EADDRINUSE` locally | Stray process on the port | `lsof -nP -iTCP:8787 -sTCP:LISTEN`, or `API_PORT=8801 npm run dev` |
| First request very slow | Free-tier cold start | Hit the URL once before judging to warm it |

---

## 6. What is NOT automated

- Choosing the provider and pressing Deploy.
- Pasting `BUDGETBALLOT_WRITE_KEY` into the provider UI.
- Filling the live URL into `README.md` and the deck (§4).
- Custom domain / DNS, if you want one.
