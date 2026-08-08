// Vercel serverless entrypoint.
//
// Vercel does not run a long-lived `app.listen()` — it invokes an exported
// handler per request. Express apps ARE valid (req, res) handlers, so we
// build the same app used everywhere else and export it directly. No logic
// is duplicated: the routes, auth, validation and engine all come from
// server/index.js.
//
// Two deliberate differences from `npm start`:
//
//  1. serveStatic: false — on Vercel the built dist/ is served by the CDN
//     (see vercel.json `outputDirectory`), not by Express. Letting Express
//     also serve it would shadow the CDN and waste function invocations.
//
//  2. Scenario writes are in-memory only. Vercel's filesystem is read-only
//     apart from /tmp, and /tmp is not shared between invocations, so
//     server/store.js detects the failed write and degrades gracefully
//     (reads, /api/impact and the whole UI keep working — a saved scenario
//     just may not survive to the next cold start). If durable scenarios
//     matter for your demo, deploy to Render instead: see DEPLOY.md.

import { createApp } from "../server/index.js";

const { app } = createApp({
  writeKey: process.env.BUDGETBALLOT_WRITE_KEY || "",
  serveStatic: false,
});

export default app;
