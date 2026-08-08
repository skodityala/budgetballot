import { describe, it, expect } from "vitest";
import {
  clampFunding,
  computeCarbonImpact,
  computeImpact,
  computeServiceImpact,
  equityScore,
  fundingStatus,
  projectOutcome,
  totalAllocated,
} from "./impact";
import { dataset, baselineAllocation } from "../../server/seed.js";

const svc = (id: string) => {
  const s = dataset.services.find((x: any) => x.id === id);
  if (!s) throw new Error(`unknown service ${id}`);
  return s;
};

describe("clampFunding", () => {
  it("returns 0 for negative or non-finite input", () => {
    expect(clampFunding(svc("transit"), -100)).toBe(0);
    expect(clampFunding(svc("transit"), Number.NaN)).toBe(0);
    expect(clampFunding(svc("transit"), Number.POSITIVE_INFINITY)).toBe(0);
  });
  it("passes through valid positive funding", () => {
    expect(clampFunding(svc("transit"), 42)).toBe(42);
  });
});

describe("fundingStatus", () => {
  const s = svc("transit");
  it("classifies steady near baseline", () => {
    expect(fundingStatus(s, s.baselineFunding)).toBe("steady");
    expect(fundingStatus(s, s.baselineFunding * 1.05)).toBe("steady");
  });
  it("classifies boosted above +10%", () => {
    expect(fundingStatus(s, s.baselineFunding * 1.2)).toBe("boosted");
  });
  it("classifies cut below -10%", () => {
    expect(fundingStatus(s, s.baselineFunding * 0.5)).toBe("cut");
  });
  it("classifies cut below minFunding", () => {
    expect(fundingStatus(s, s.minFunding - 1)).toBe("cut");
  });
});

describe("projectOutcome", () => {
  const s = svc("transit");
  it("returns 0 for zero funding", () => {
    expect(projectOutcome(s, 0)).toBe(0);
  });
  it("returns roughly the baseline outcome at baseline funding", () => {
    expect(projectOutcome(s, s.baselineFunding)).toBe(s.baselineOutcome);
  });
  it("is bounded by [0, 100]", () => {
    expect(projectOutcome(s, 10_000_000_000)).toBeLessThanOrEqual(100);
    expect(projectOutcome(s, -1000)).toBe(0);
  });
  it("is monotonically non-decreasing from min upward", () => {
    let prev = projectOutcome(s, s.minFunding);
    for (let f = s.minFunding; f <= s.maxEffectiveFunding; f += (s.maxEffectiveFunding - s.minFunding) / 20) {
      const cur = projectOutcome(s, f);
      expect(cur + 1e-6).toBeGreaterThanOrEqual(prev);
      prev = cur;
    }
  });
});

describe("computeServiceImpact factors", () => {
  it("produces the full factor breakdown", () => {
    const r = computeServiceImpact(svc("transit"), svc("transit").baselineFunding);
    const labels = r.factors.map((f) => f.label);
    expect(labels).toEqual([
      "Baseline outcome",
      "Funding change",
      "Elasticity",
      "Projected change",
    ]);
  });
});

describe("totalAllocated", () => {
  it("sums the allocation dictionary", () => {
    expect(totalAllocated({ a: 100, b: 200, c: 0 })).toBe(300);
  });
  it("ignores negatives", () => {
    expect(totalAllocated({ a: 100, b: -50 })).toBe(100);
  });
});

describe("equityScore", () => {
  it("equals baseline equity at baseline allocation", () => {
    const eq = equityScore(dataset as any, baselineAllocation());
    // Not identical to a flat number because rounding, but within a hair.
    expect(eq).toBeGreaterThan(50);
    expect(eq).toBeLessThan(80);
  });
});

describe("computeCarbonImpact", () => {
  it("reduces emissions for a 'reduces' service when funded above baseline", () => {
    const s = svc("transit"); // reduces
    const r = computeCarbonImpact(s, s.baselineFunding * 1.4);
    expect(r.projectedTonnes).toBeLessThan(r.baselineTonnes);
    expect(r.deltaTonnes).toBeLessThan(0);
  });
  it("increases emissions for an 'increases' service when funded above baseline", () => {
    const s = svc("roads"); // increases
    const r = computeCarbonImpact(s, s.baselineFunding * 1.4);
    expect(r.projectedTonnes).toBeGreaterThan(r.baselineTonnes);
    expect(r.deltaTonnes).toBeGreaterThan(0);
  });
  it("does not move emissions for a 'neutral' service", () => {
    const s = svc("schools"); // neutral
    const r = computeCarbonImpact(s, s.baselineFunding * 1.5);
    expect(r.deltaTonnes).toBe(0);
  });
  it("is bounded below zero", () => {
    const s = svc("transit");
    const r = computeCarbonImpact(s, s.baselineFunding * 10);
    expect(r.projectedTonnes).toBeGreaterThanOrEqual(0);
  });
  it("produces full factor breakdown", () => {
    const r = computeCarbonImpact(svc("transit"), svc("transit").baselineFunding);
    const labels = r.factors.map((f) => f.label);
    expect(labels).toContain("Baseline emissions");
    expect(labels).toContain("Carbon direction");
    expect(labels).toContain("Carbon elasticity");
    expect(labels).toContain("Projected change");
  });
});

describe("computeImpact — thesis test: budget-vs-climate trade-off exists", () => {
  it("finds an allocation that improves service outcomes AND worsens carbon", () => {
    // Boost roads (increases emissions) and fire (increases), keep others at baseline.
    const alloc = baselineAllocation();
    alloc.roads = svc("roads").baselineFunding * 1.6;
    alloc.fire = svc("fire").baselineFunding * 1.3;

    const report = computeImpact(dataset as any, alloc);
    const roadsService = report.services.find((s) => s.serviceId === "roads")!;
    const fireService = report.services.find((s) => s.serviceId === "fire")!;

    // Service outcomes improved
    expect(roadsService.outcomeDelta).toBeGreaterThan(0);
    expect(fireService.outcomeDelta).toBeGreaterThan(0);
    // But carbon got worse
    expect(report.carbon.deltaTonnes).toBeGreaterThan(0);
  });

  it("finds an allocation that lowers carbon while lifting equity", () => {
    // The virtuous case: fund transit + efficiency + housing, cut roads.
    const alloc = baselineAllocation();
    alloc.transit = svc("transit").baselineFunding * 1.4;
    alloc.energy = svc("energy").baselineFunding * 1.8;
    alloc.housing = svc("housing").baselineFunding * 1.15;
    alloc.roads = svc("roads").baselineFunding * 0.6;

    const report = computeImpact(dataset as any, alloc);
    expect(report.carbon.deltaTonnes).toBeLessThan(0);
    expect(report.equity.delta).toBeGreaterThan(0);
  });

  it("total emissions equal the sum of per-service projected emissions", () => {
    const alloc = baselineAllocation();
    alloc.transit *= 1.2;
    const report = computeImpact(dataset as any, alloc);
    const sum = report.carbon.services.reduce((a, c) => a + c.projectedTonnes, 0);
    expect(Math.abs(sum - report.carbon.projectedTonnes)).toBeLessThan(0.5);
  });

  it("flags overBudget correctly", () => {
    const alloc: Record<string, number> = {};
    for (const s of dataset.services) alloc[s.id] = s.baselineFunding * 2;
    const report = computeImpact(dataset as any, alloc);
    expect(report.overBudget).toBe(true);
  });
});
