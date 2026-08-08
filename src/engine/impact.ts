// BudgetBallot impact model — TypeScript implementation.
//
// This file is mirrored by server/engine.js. Both implementations must produce
// identical numbers for identical inputs; src/engine/parity.test.ts enforces
// this. If you change the math here, change it there too.
//
// Design constraint: every number the model produces is decomposed into
// `Factor` entries. No opaque coefficients. This is the whole product.

import type {
  Allocation,
  CarbonDirection,
  CarbonImpact,
  Dataset,
  Factor,
  FundingStatus,
  ImpactReport,
  Service,
  ServiceImpact,
} from "./types";

/** Round to two decimal places to keep parity with JS engine stable. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Clamp funding to the service's allowed range. Never negative.
 *  Kept as (service, funding) for symmetry with the JS engine and to leave
 *  room for per-service caps in the future. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function clampFunding(_service: Service, funding: number): number {
  if (!Number.isFinite(funding) || funding < 0) return 0;
  // We don't cap at maxEffectiveFunding here — over-funding is legal, it just
  // has sharply diminishing returns in projectOutcome.
  return funding;
}

/** Classify a funding level against the service's baseline. */
export function fundingStatus(service: Service, funding: number): FundingStatus {
  if (funding < service.minFunding) return "cut";
  if (funding < service.baselineFunding * 0.9) return "cut";
  if (funding > service.baselineFunding * 1.1) return "boosted";
  return "steady";
}

/**
 * Project an outcome (0..100) for a service at a given funding level.
 *
 * Model: piecewise linear with diminishing returns beyond the "effective" cap.
 *   below min:     outcome collapses toward 0 proportional to how far below min
 *   min..baseline: linear ramp using elasticity
 *   baseline..cap: linear ramp using elasticity, but at half slope
 *   above cap:     asymptotic — 20% of remaining outcome per doubling of dollars
 *
 * Bounded to [0, 100].
 */
export function projectOutcome(service: Service, funding: number): number {
  const f = clampFunding(service, funding);
  const { minFunding, baselineFunding, maxEffectiveFunding, baselineOutcome, elasticity } = service;

  let outcome: number;
  if (f <= 0) {
    outcome = 0;
  } else if (f < minFunding) {
    // Collapse toward zero
    outcome = baselineOutcome * elasticity * (f / minFunding) * 0.5;
  } else if (f <= baselineFunding) {
    const t = (f - minFunding) / Math.max(1, baselineFunding - minFunding);
    const floor = baselineOutcome * (1 - elasticity);
    outcome = floor + (baselineOutcome - floor) * t;
  } else if (f <= maxEffectiveFunding) {
    const t = (f - baselineFunding) / Math.max(1, maxEffectiveFunding - baselineFunding);
    const ceiling = Math.min(100, baselineOutcome + baselineOutcome * elasticity * 0.5);
    outcome = baselineOutcome + (ceiling - baselineOutcome) * t;
  } else {
    // Diminishing returns above the effective cap
    const ceiling = Math.min(100, baselineOutcome + baselineOutcome * elasticity * 0.5);
    const overshoot = Math.log2(1 + (f - maxEffectiveFunding) / Math.max(1, maxEffectiveFunding));
    outcome = ceiling + (100 - ceiling) * (1 - Math.pow(0.8, overshoot));
  }

  return round2(Math.max(0, Math.min(100, outcome)));
}

/** Compute the outcome and full factor breakdown for one service. */
export function computeServiceImpact(service: Service, funding: number): ServiceImpact {
  const f = clampFunding(service, funding);
  const status = fundingStatus(service, f);
  const projected = projectOutcome(service, f);
  const delta = round2(projected - service.baselineOutcome);
  const fundingDelta = round2(f - service.baselineFunding);

  const factors: Factor[] = [
    {
      label: "Baseline outcome",
      value: service.baselineOutcome,
      note: `${service.name} performs at ${service.baselineOutcome} when funded at the recommended $${service.baselineFunding.toLocaleString()}.`,
    },
    {
      label: "Funding change",
      value: fundingDelta,
      note:
        fundingDelta === 0
          ? "Funded at baseline."
          : `${fundingDelta > 0 ? "+" : ""}$${fundingDelta.toLocaleString()} vs. baseline.`,
    },
    {
      label: "Elasticity",
      value: service.elasticity,
      note: `Service outcomes move ${Math.round(service.elasticity * 100)}% as fast as funding, near baseline.`,
    },
    {
      label: "Projected change",
      value: delta,
      note: `${delta >= 0 ? "+" : ""}${delta} point change in service outcome.`,
    },
  ];

  return {
    serviceId: service.id,
    serviceName: service.name,
    funding: f,
    fundingDelta,
    fundingStatus: status,
    baselineOutcome: service.baselineOutcome,
    projectedOutcome: projected,
    outcomeDelta: delta,
    factors,
  };
}

/** Sum of all allocated dollars. */
export function totalAllocated(allocation: Allocation): number {
  let sum = 0;
  for (const k of Object.keys(allocation)) sum += Math.max(0, allocation[k] || 0);
  return round2(sum);
}

/**
 * Equity score, 0..100.
 *
 * Weighted average of per-service (projectedOutcome * equityWeight), normalized
 * against the same computation at baseline. Services with high equityWeight
 * (transit, housing, health) move the number more than low-weight services.
 */
export function equityScore(dataset: Dataset, allocation: Allocation): number {
  let num = 0;
  let denom = 0;
  for (const s of dataset.services) {
    const f = clampFunding(s, allocation[s.id] ?? s.baselineFunding);
    const o = projectOutcome(s, f);
    num += o * s.equityWeight;
    denom += s.equityWeight;
  }
  if (denom === 0) return 0;
  return round2(num / denom);
}

/** Baseline equity score (all services funded at baselineFunding). */
export function baselineEquityScore(dataset: Dataset): number {
  let num = 0;
  let denom = 0;
  for (const s of dataset.services) {
    num += s.baselineOutcome * s.equityWeight;
    denom += s.equityWeight;
  }
  if (denom === 0) return 0;
  return round2(num / denom);
}

/**
 * Compute carbon impact for one service, given its funding level.
 *
 * Model:
 *   ratio = funding / baselineFunding
 *   response = (ratio - 1) * carbonElasticity
 *   For "reduces":   projected = baseline * (1 - response)
 *   For "increases": projected = baseline * (1 + response)
 *   For "neutral":   projected = baseline
 *
 * Bounded so projected cannot be negative.
 */
export function computeCarbonImpact(service: Service, funding: number): CarbonImpact {
  const f = clampFunding(service, funding);
  const ratio = service.baselineFunding > 0 ? f / service.baselineFunding : 1;
  const response = (ratio - 1) * service.carbonElasticity;

  let projected = service.baselineEmissionsTonnes;
  if (service.carbonDirection === "reduces") {
    projected = service.baselineEmissionsTonnes * (1 - response);
  } else if (service.carbonDirection === "increases") {
    projected = service.baselineEmissionsTonnes * (1 + response);
  }
  projected = Math.max(0, projected);

  const delta = round2(projected - service.baselineEmissionsTonnes);
  const factors: Factor[] = [
    {
      label: "Baseline emissions",
      value: round2(service.baselineEmissionsTonnes),
      note: `${service.name} contributes ~${Math.round(service.baselineEmissionsTonnes)} tCO2e/yr at baseline funding.`,
    },
    {
      label: "Funding ratio",
      value: round2(ratio),
      note: `Funded at ${Math.round(ratio * 100)}% of baseline.`,
    },
    {
      label: "Carbon direction",
      value: service.carbonDirection === "reduces" ? -1 : service.carbonDirection === "increases" ? 1 : 0,
      note: `More funding ${service.carbonDirection} emissions — ${service.carbonRationale}`,
    },
    {
      label: "Carbon elasticity",
      value: service.carbonElasticity,
      note: `Emissions move ${Math.round(service.carbonElasticity * 100)}% as fast as funding.`,
    },
    {
      label: "Projected change",
      value: delta,
      note: `${delta >= 0 ? "+" : ""}${round2(delta)} tCO2e/yr vs. baseline.`,
    },
  ];

  return {
    serviceId: service.id,
    serviceName: service.name,
    baselineTonnes: round2(service.baselineEmissionsTonnes),
    projectedTonnes: round2(projected),
    deltaTonnes: delta,
    direction: service.carbonDirection as CarbonDirection,
    factors,
  };
}

/** Full impact report for a scenario. */
export function computeImpact(dataset: Dataset, allocation: Allocation): ImpactReport {
  const services: ServiceImpact[] = dataset.services.map((s) =>
    computeServiceImpact(s, allocation[s.id] ?? s.baselineFunding),
  );

  const total = totalAllocated(allocation);
  const overBudget = total > dataset.totalBudget;

  const eqBaseline = baselineEquityScore(dataset);
  const eqScore = equityScore(dataset, allocation);
  const eqDelta = round2(eqScore - eqBaseline);

  const equityFactors: Factor[] = [
    { label: "Baseline equity", value: eqBaseline, note: "Weighted average of service outcomes at baseline funding, weighted by equity importance." },
    { label: "Projected equity", value: eqScore, note: "Same computation, using your allocation." },
    { label: "Delta", value: eqDelta, note: `${eqDelta >= 0 ? "+" : ""}${eqDelta} points vs. baseline.` },
  ];

  const carbonServices: CarbonImpact[] = dataset.services.map((s) =>
    computeCarbonImpact(s, allocation[s.id] ?? s.baselineFunding),
  );

  const carbonBaseline = round2(
    dataset.services.reduce((acc, s) => acc + s.baselineEmissionsTonnes, 0),
  );
  const carbonProjected = round2(carbonServices.reduce((acc, c) => acc + c.projectedTonnes, 0));
  const carbonDelta = round2(carbonProjected - carbonBaseline);

  const carbonFactors: Factor[] = [
    { label: "Baseline emissions", value: carbonBaseline, note: "Sum of per-service baseline emissions." },
    { label: "Projected emissions", value: carbonProjected, note: "Sum of per-service projected emissions under your allocation." },
    { label: "Delta", value: carbonDelta, note: `${carbonDelta >= 0 ? "+" : ""}${carbonDelta} tCO2e/yr vs. baseline.` },
  ];

  return {
    totalAllocated: total,
    totalBudget: dataset.totalBudget,
    overBudget,
    services,
    equity: {
      score: eqScore,
      baselineScore: eqBaseline,
      delta: eqDelta,
      factors: equityFactors,
    },
    carbon: {
      baselineTonnes: carbonBaseline,
      projectedTonnes: carbonProjected,
      deltaTonnes: carbonDelta,
      services: carbonServices,
      factors: carbonFactors,
    },
  };
}
