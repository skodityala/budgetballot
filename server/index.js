// Express API for BudgetBallot.
//
// Public reads (GET) — /api/health, /api/dataset, /api/scenarios, /api/scenarios/:id, POST /api/impact (pure compute)
// Protected writes — POST /api/scenarios, DELETE /api/scenarios/:id (require BUDGETBALLOT_WRITE_KEY)
//
// Security posture (see README §Security):
//   * shared-secret header auth on mutations (Authorization: Bearer <key> OR x-write-key: <key>)
//   * in-process token-bucket rate limit on mutations
//   * strict input validation (server/validate.js)
//   * IDs generated via crypto.randomUUID
//   * body size capped by express.json({ limit })
//   * errors returned as JSON, never a stack trace
//
// Reads are unauthenticated by design: this is a civic transparency tool and
// scenarios are meant to be shareable. We document this in the README.

import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";
import { computeImpact } from "./engine.js";
import { validateAllocation, validateScenarioCreate } from "./validate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.resolve(__dirname, "..", "dist");

/**
 * @param {object}  opts
 * @param {string}  opts.writeKey  shared secret for mutations
 * @param {boolean} opts.serveStatic  serve built dist/ + SPA fallback.
 *   Defaults to true in production, false otherwise, so unit tests that
 *   construct the app directly are never affected by the presence of dist/.
 */
export function createApp({ writeKey, serveStatic } = {}) {
  const app = express();
  const store = createStore();

  app.use(express.json({ limit: "128kb" }));

  // ------- rate limiter (writes only) ---------------------------------------
  // Token bucket: 20 writes/minute per IP. Cheap, no deps, resets in-process.
  const buckets = new Map();
  const RATE = { capacity: 20, refillPerMs: 20 / 60_000 };

  function takeToken(ip) {
    const now = Date.now();
    const b = buckets.get(ip) || { tokens: RATE.capacity, ts: now };
    const elapsed = now - b.ts;
    b.tokens = Math.min(RATE.capacity, b.tokens + elapsed * RATE.refillPerMs);
    b.ts = now;
    if (b.tokens < 1) {
      buckets.set(ip, b);
      return false;
    }
    b.tokens -= 1;
    buckets.set(ip, b);
    return true;
  }

  function requireWriteAuth(req, res, next) {
    // Auth gate
    if (!writeKey) {
      return res
        .status(503)
        .json({ error: "server misconfigured: BUDGETBALLOT_WRITE_KEY is not set" });
    }
    const header = req.get("authorization") || "";
    const bearer = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const supplied = bearer || req.get("x-write-key") || "";
    if (!supplied || !safeEqual(supplied, writeKey)) {
      return res.status(401).json({ error: "unauthorized" });
    }
    // Rate gate
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    if (!takeToken(ip)) {
      return res.status(429).json({ error: "rate limit exceeded" });
    }
    return next();
  }

  // ------- routes -----------------------------------------------------------

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "budgetballot", ts: new Date().toISOString() });
  });

  app.get("/api/dataset", (_req, res) => {
    res.json(store.getDataset());
  });

  app.post("/api/impact", (req, res) => {
    const dataset = store.getDataset();
    const { allocation } = req.body || {};
    const v = validateAllocation(dataset, allocation);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const report = computeImpact(dataset, allocation);
    res.json(report);
  });

  app.get("/api/scenarios", (_req, res) => {
    res.json(store.list());
  });

  app.get("/api/scenarios/:id", (req, res) => {
    const s = store.get(req.params.id);
    if (!s) return res.status(404).json({ error: "not found" });
    res.json(s);
  });

  app.post("/api/scenarios", requireWriteAuth, (req, res) => {
    const dataset = store.getDataset();
    const v = validateScenarioCreate(dataset, req.body);
    if (!v.ok) return res.status(400).json({ error: v.error });
    const created = store.create({ name: req.body.name.trim(), allocation: req.body.allocation });
    res.status(201).json(created);
  });

  app.delete("/api/scenarios/:id", requireWriteAuth, (req, res) => {
    const removed = store.remove(req.params.id);
    if (!removed) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  });

  // Any unmatched /api/* path is a JSON 404 — never fall through to the SPA,
  // so a typo'd endpoint doesn't return index.html with a 200.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "unknown endpoint" });
  });

  // ------- static SPA (production single deployable unit) --------------------
  // In dev, Vite serves the client on its own port and proxies /api here.
  // In production there is ONE process: Express serves the built dist/ and
  // falls back to index.html so client-side routes (/allocate, /impact,
  // /compare, /about) survive a hard refresh or a shared deep link.
  const wantStatic = serveStatic ?? process.env.NODE_ENV === "production";
  const hasDist = fs.existsSync(path.join(DIST_DIR, "index.html"));

  if (wantStatic && hasDist) {
    // Hashed assets are immutable; index.html must never be cached.
    app.use(
      express.static(DIST_DIR, {
        index: false,
        setHeaders(res, filePath) {
          if (filePath.endsWith("index.html")) {
            res.setHeader("Cache-Control", "no-cache");
          } else if (/\/assets\//.test(filePath)) {
            res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
          }
        },
      }),
    );

    // SPA fallback — GET/HEAD only, so a stray POST doesn't get HTML.
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(DIST_DIR, "index.html"));
    });
  } else if (wantStatic && !hasDist) {
    app.get("*", (_req, res) => {
      res.status(503).type("text/plain").send(
        "BudgetBallot: dist/ not found. Run `npm run build` before `npm start`.",
      );
    });
  }

  // JSON error handler — never leak stack traces
  app.use((err, _req, res, _next) => {
    // eslint-disable-next-line no-console
    console.error("api error:", err?.message || err);
    if (res.headersSent) return;
    res.status(500).json({ error: "internal error" });
  });

  return { app, store };
}

/** Constant-time-ish string comparison to reduce timing leaks. */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

// Boot when invoked directly (node server/index.js).
const isDirectBoot = (() => {
  try {
    const url = new URL(import.meta.url);
    return process.argv[1] && url.pathname.endsWith(process.argv[1].replace(/^.*\//, "/"));
  } catch {
    return false;
  }
})();

if (isDirectBoot) {
  const isProd = process.env.NODE_ENV === "production";
  // Port precedence is deliberately different per environment:
  //   production → PORT wins. Hosting platforms (Render/Fly/Cloud Run/Heroku)
  //                inject PORT and expect us to bind exactly it.
  //   development → API_PORT wins, so `API_PORT=8801 npm run dev` can dodge a
  //                stray process on 8787 while vite.config.ts proxies to the
  //                same value. Both sides read API_PORT, so they stay in sync.
  const port = Number(
    isProd
      ? process.env.PORT || 8787
      : process.env.API_PORT || process.env.PORT || 8787,
  );
  const host = process.env.HOST || "0.0.0.0";
  const writeKey = process.env.BUDGETBALLOT_WRITE_KEY || "";
  if (!writeKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[budgetballot] WARNING: BUDGETBALLOT_WRITE_KEY is not set — mutating routes will return 503.",
    );
  }
  const { app } = createApp({ writeKey });
  const serving = isProd;
  if (serving && !fs.existsSync(path.join(DIST_DIR, "index.html"))) {
    // eslint-disable-next-line no-console
    console.warn("[budgetballot] WARNING: dist/ missing — run `npm run build` first.");
  }
  // Bind 0.0.0.0 so container platforms (Render, Fly, Cloud Run) can route to us.
  const server = app.listen(port, host, () => {
    // eslint-disable-next-line no-console
    console.log(
      `[budgetballot] listening on http://localhost:${port} ` +
        `(env=${process.env.NODE_ENV || "development"}, static=${serving ? "on" : "off"})`,
    );
  });

  // Fail loudly and usefully instead of dumping a raw Node stack trace.
  server.on("error", (err) => {
    if (err && err.code === "EADDRINUSE") {
      // eslint-disable-next-line no-console
      console.error(
        `[budgetballot] ERROR: port ${port} is already in use.\n` +
          `  Find it:  lsof -nP -iTCP:${port} -sTCP:LISTEN\n` +
          `  Or pick another port:  API_PORT=8801 npm run dev`,
      );
      process.exit(1);
    }
    throw err;
  });

  // Clean shutdown so container platforms don't wait out a kill timeout.
  for (const sig of ["SIGTERM", "SIGINT"]) {
    process.on(sig, () => server.close(() => process.exit(0)));
  }
}
