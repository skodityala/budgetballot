import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../../server/index.js";
import { baselineAllocation } from "../../server/seed.js";

const WRITE_KEY = "test-key-do-not-use-in-prod";

function makeApp() {
  const { app, store } = createApp({ writeKey: WRITE_KEY });
  store._reset();
  return { app, store };
}

describe("API — reads (public)", () => {
  it("GET /api/health returns ok", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("GET /api/dataset returns services", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/dataset");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.services)).toBe(true);
    expect(res.body.services.length).toBeGreaterThan(0);
  });

  it("POST /api/impact computes a report", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/impact")
      .send({ allocation: baselineAllocation() });
    expect(res.status).toBe(200);
    expect(res.body.services).toBeDefined();
    expect(res.body.carbon).toBeDefined();
    expect(res.body.equity).toBeDefined();
  });

  it("POST /api/impact rejects malformed allocation with 400", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/impact")
      .send({ allocation: { transit: "not-a-number" } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/finite number/);
  });

  it("POST /api/impact rejects unknown service id", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/impact")
      .send({ allocation: { moonbase: 1000 } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/unknown service/);
  });

  it("GET /api/scenarios lists the baseline scenario", async () => {
    const { app } = makeApp();
    const res = await request(app).get("/api/scenarios");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
});

describe("API — writes (auth required)", () => {
  it("POST /api/scenarios without key returns 401", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .send({ name: "no-auth", allocation: baselineAllocation() });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("unauthorized");
  });

  it("POST /api/scenarios with wrong key returns 401", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", "definitely-wrong")
      .send({ name: "bad-auth", allocation: baselineAllocation() });
    expect(res.status).toBe(401);
  });

  it("POST /api/scenarios with correct Bearer succeeds", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .set("authorization", `Bearer ${WRITE_KEY}`)
      .send({ name: "authed", allocation: baselineAllocation() });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("POST /api/scenarios with correct x-write-key succeeds", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", WRITE_KEY)
      .send({ name: "authed2", allocation: baselineAllocation() });
    expect(res.status).toBe(201);
  });

  it("POST /api/scenarios rejects missing name with 400 (authed)", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", WRITE_KEY)
      .send({ allocation: baselineAllocation() });
    expect(res.status).toBe(400);
  });

  it("POST /api/scenarios rejects malformed allocation (authed)", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", WRITE_KEY)
      .send({ name: "x", allocation: { transit: -1 } });
    expect(res.status).toBe(400);
  });

  it("DELETE /api/scenarios/:id without key returns 401", async () => {
    const { app } = makeApp();
    const res = await request(app).delete("/api/scenarios/anything");
    expect(res.status).toBe(401);
  });

  it("DELETE /api/scenarios/:id with correct key returns 204", async () => {
    const { app } = makeApp();
    const created = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", WRITE_KEY)
      .send({ name: "to-delete", allocation: baselineAllocation() });
    const del = await request(app)
      .delete(`/api/scenarios/${created.body.id}`)
      .set("x-write-key", WRITE_KEY);
    expect(del.status).toBe(204);
  });

  it("DELETE unknown id returns 404 (authed)", async () => {
    const { app } = makeApp();
    const res = await request(app)
      .delete("/api/scenarios/does-not-exist")
      .set("x-write-key", WRITE_KEY);
    expect(res.status).toBe(404);
  });
});

describe("API — misconfiguration", () => {
  it("returns 503 for writes when no write key is configured", async () => {
    const { app, store } = createApp({ writeKey: "" });
    store._reset();
    const res = await request(app)
      .post("/api/scenarios")
      .set("x-write-key", "anything")
      .send({ name: "x", allocation: baselineAllocation() });
    expect(res.status).toBe(503);
  });
});
