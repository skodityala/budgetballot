// Parity test: TypeScript engine (client) MUST agree with JS engine (server).
//
// This is the safety net for the dual-implementation design. Any change to the
// math must be made in BOTH src/engine/impact.ts AND server/engine.js, or this
// test fails. Do not weaken this test to make a change easier — if it fails,
// your change is wrong.

import { describe, it, expect } from "vitest";
import {
  clampFunding as tsClamp,
  computeCarbonImpact as tsCarbon,
  computeImpact as tsImpact,
  computeServiceImpact as tsService,
  equityScore as tsEquity,
  projectOutcome as tsProject,
} from "./impact";
import {
  clampFunding as jsClamp,
  computeCarbonImpact as jsCarbon,
  computeImpact as jsImpact,
  computeServiceImpact as jsService,
  equityScore as jsEquity,
  projectOutcome as jsProject,
} from "../../server/engine.js";
import { dataset, baselineAllocation } from "../../server/seed.js";

const services = dataset.services;

// Deterministic pseudo-random allocations
function pseudoAllocations(n: number) {
  const out: Record<string, number>[] = [];
  let seed = 1234567;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };
  for (let i = 0; i < n; i++) {
    const a: Record<string, number> = {};
    for (const s of services) {
      // Range: 0.4x to 2.0x baseline
      a[s.id] = Math.round(s.baselineFunding * (0.4 + rand() * 1.6));
    }
    out.push(a);
  }
  return out;
}

describe("engine parity — TS ↔ JS", () => {
  it("clampFunding matches", () => {
    for (const s of services) {
      for (const v of [-1, 0, 1000, s.baselineFunding, s.baselineFunding * 3]) {
        expect(tsClamp(s as any, v)).toBe(jsClamp(s as any, v));
      }
    }
  });

  it("projectOutcome matches across the funding range", () => {
    for (const s of services) {
      const steps = [0, s.minFunding * 0.5, s.minFunding, s.baselineFunding, s.maxEffectiveFunding, s.maxEffectiveFunding * 2];
      for (const f of steps) {
        expect(tsProject(s as any, f)).toBe(jsProject(s as any, f));
      }
    }
  });

  it("computeServiceImpact numeric fields match", () => {
    for (const s of services) {
      for (const f of [s.minFunding, s.baselineFunding, s.baselineFunding * 1.2]) {
        const t = tsService(s as any, f);
        const j = jsService(s as any, f);
        expect(t.funding).toBe(j.funding);
        expect(t.fundingDelta).toBe(j.fundingDelta);
        expect(t.fundingStatus).toBe(j.fundingStatus);
        expect(t.projectedOutcome).toBe(j.projectedOutcome);
        expect(t.outcomeDelta).toBe(j.outcomeDelta);
      }
    }
  });

  it("computeCarbonImpact numeric fields match", () => {
    for (const s of services) {
      for (const f of [s.baselineFunding * 0.6, s.baselineFunding, s.baselineFunding * 1.5]) {
        const t = tsCarbon(s as any, f);
        const j = jsCarbon(s as any, f);
        expect(t.baselineTonnes).toBe(j.baselineTonnes);
        expect(t.projectedTonnes).toBe(j.projectedTonnes);
        expect(t.deltaTonnes).toBe(j.deltaTonnes);
        expect(t.direction).toBe(j.direction);
      }
    }
  });

  it("equityScore matches", () => {
    const a = baselineAllocation();
    expect(tsEquity(dataset as any, a)).toBe(jsEquity(dataset as any, a));
  });

  it("computeImpact matches on baseline allocation", () => {
    const a = baselineAllocation();
    const t = tsImpact(dataset as any, a);
    const j = jsImpact(dataset as any, a);
    expect(t.totalAllocated).toBe(j.totalAllocated);
    expect(t.equity.score).toBe(j.equity.score);
    expect(t.equity.delta).toBe(j.equity.delta);
    expect(t.carbon.projectedTonnes).toBe(j.carbon.projectedTonnes);
    expect(t.carbon.deltaTonnes).toBe(j.carbon.deltaTonnes);
  });

  it("computeImpact matches on 12 pseudo-random allocations", () => {
    for (const a of pseudoAllocations(12)) {
      const t = tsImpact(dataset as any, a);
      const j = jsImpact(dataset as any, a);
      expect(t.totalAllocated).toBe(j.totalAllocated);
      expect(t.overBudget).toBe(j.overBudget);
      expect(t.equity.score).toBe(j.equity.score);
      expect(t.carbon.projectedTonnes).toBe(j.carbon.projectedTonnes);
      expect(t.carbon.deltaTonnes).toBe(j.carbon.deltaTonnes);
      for (let i = 0; i < t.services.length; i++) {
        expect(t.services[i].projectedOutcome).toBe(j.services[i].projectedOutcome);
      }
    }
  });
});
