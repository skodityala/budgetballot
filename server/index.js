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
import { createStore } from "./store.js";
import { computeImpact } from "./engine.js";
import { validateAllocation, validateScenarioCreate } from "./validate.js";

export function createApp({ writeKey } = {}) {
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
  const port = Number(process.env.PORT || 8787);
  const writeKey = process.env.BUDGETBALLOT_WRITE_KEY || "";
  if (!writeKey) {
    // eslint-disable-next-line no-console
    console.warn(
      "[budgetballot] WARNING: BUDGETBALLOT_WRITE_KEY is not set — mutating routes will return 503.",
    );
  }
  const { app } = createApp({ writeKey });
  app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[budgetballot] api listening on http://localhost:${port}`);
  });
}
