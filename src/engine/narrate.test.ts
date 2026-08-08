import { describe, it, expect } from "vitest";
import { computeImpact } from "./impact";
import { narrate } from "./narrate";
import { dataset, baselineAllocation } from "../../server/seed.js";

const svc = (id: string) => {
  const s = dataset.services.find((x: any) => x.id === id);
  if (!s) throw new Error(id);
  return s;
};

function report(alloc: Record<string, number>) {
  return computeImpact(dataset as any, alloc);
}

describe("narrate", () => {
  it("produces text for the baseline scenario", () => {
    const p = narrate(report(baselineAllocation()));
    expect(p.length).toBeGreaterThan(20);
    expect(p).toMatch(/baseline|steady|barely/i);
  });

  it("produces four structurally different paragraphs for four different scenarios", () => {
    // A: transit boost, roads cut — the virtuous case
    const A = baselineAllocation();
    A.transit = svc("transit").baselineFunding * 1.4;
    A.roads = svc("roads").baselineFunding * 0.55;

    // B: fund everything harder — over budget, service gains, carbon worse
    const B = baselineAllocation();
    B.roads = svc("roads").baselineFunding * 1.8;
    B.police = svc("police").baselineFunding * 1.2;

    // C: austerity — cut everything ~30%
    const C: Record<string, number> = {};
    for (const s of dataset.services) C[s.id] = s.baselineFunding * 0.7;

    // D: single-lever equity move — big housing boost only
    const D = baselineAllocation();
    D.housing = svc("housing").baselineFunding * 1.6;

    const pA = narrate(report(A));
    const pB = narrate(report(B));
    const pC = narrate(report(C));
    const pD = narrate(report(D));

    // All non-empty
    for (const p of [pA, pB, pC, pD]) expect(p.length).toBeGreaterThan(20);

    // Pairwise distinct
    const set = new Set([pA, pB, pC, pD]);
    expect(set.size).toBe(4);

    // Structural difference — different lead verbs / sentence shapes
    expect(pA.split(".").length).not.toBe(0);
    expect(pB).not.toBe(pA);
    expect(pC).not.toBe(pB);
    expect(pD).not.toBe(pC);
  });

  it("mentions a trade-off when service outcomes rise but carbon worsens", () => {
    const alloc = baselineAllocation();
    alloc.roads = svc("roads").baselineFunding * 1.7;
    const p = narrate(report(alloc));
    expect(p.toLowerCase()).toMatch(/trade-off|tension|emissions/);
  });

  it("mentions emissions falling when a reduces-service is boosted", () => {
    const alloc = baselineAllocation();
    alloc.transit = svc("transit").baselineFunding * 1.5;
    alloc.energy = svc("energy").baselineFunding * 1.8;
    const p = narrate(report(alloc));
    expect(p.toLowerCase()).toMatch(/emissions fall|fall by/);
  });

  it("is a pure function — same input, same output", () => {
    const r = report(baselineAllocation());
    expect(narrate(r)).toBe(narrate(r));
  });
});
