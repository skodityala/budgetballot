// BudgetBallot impact model — JavaScript implementation (server-side).
//
// This file is a byte-for-behavior mirror of src/engine/impact.ts.
// If you change the math here, change it there too. parity.test.ts enforces
// that both implementations produce identical numbers.

export const round2 = (n) => Math.round(n * 100) / 100;

export function clampFunding(_service, funding) {
  if (!Number.isFinite(funding) || funding < 0) return 0;
  return funding;
}

export function fundingStatus(service, funding) {
  if (funding < service.minFunding) return "cut";
  if (funding < service.baselineFunding * 0.9) return "cut";
  if (funding > service.baselineFunding * 1.1) return "boosted";
  return "steady";
}

export function projectOutcome(service, funding) {
  const f = clampFunding(service, funding);
  const { minFunding, baselineFunding, maxEffectiveFunding, baselineOutcome, elasticity } = service;

  let outcome;
  if (f <= 0) {
    outcome = 0;
  } else if (f < minFunding) {
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
    const ceiling = Math.min(100, baselineOutcome + baselineOutcome * elasticity * 0.5);
    const overshoot = Math.log2(1 + (f - maxEffectiveFunding) / Math.max(1, maxEffectiveFunding));
    outcome = ceiling + (100 - ceiling) * (1 - Math.pow(0.8, overshoot));
  }

  return round2(Math.max(0, Math.min(100, outcome)));
}

export function computeServiceImpact(service, funding) {
  const f = clampFunding(service, funding);
  const status = fundingStatus(service, f);
  const projected = projectOutcome(service, f);
  const delta = round2(projected - service.baselineOutcome);
  const fundingDelta = round2(f - service.baselineFunding);

  const factors = [
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

export function totalAllocated(allocation) {
  let sum = 0;
  for (const k of Object.keys(allocation)) sum += Math.max(0, allocation[k] || 0);
  return round2(sum);
}

export function equityScore(dataset, allocation) {
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

export function baselineEquityScore(dataset) {
  let num = 0;
  let denom = 0;
  for (const s of dataset.services) {
    num += s.baselineOutcome * s.equityWeight;
    denom += s.equityWeight;
  }
  if (denom === 0) return 0;
  return round2(num / denom);
}

export function computeCarbonImpact(service, funding) {
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
  const factors = [
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
    direction: service.carbonDirection,
    factors,
  };
}

export function computeImpact(dataset, allocation) {
  const services = dataset.services.map((s) =>
    computeServiceImpact(s, allocation[s.id] ?? s.baselineFunding),
  );

  const total = totalAllocated(allocation);
  const overBudget = total > dataset.totalBudget;

  const eqBaseline = baselineEquityScore(dataset);
  const eqScore = equityScore(dataset, allocation);
  const eqDelta = round2(eqScore - eqBaseline);

  const equityFactors = [
    { label: "Baseline equity", value: eqBaseline, note: "Weighted average of service outcomes at baseline funding, weighted by equity importance." },
    { label: "Projected equity", value: eqScore, note: "Same computation, using your allocation." },
    { label: "Delta", value: eqDelta, note: `${eqDelta >= 0 ? "+" : ""}${eqDelta} points vs. baseline.` },
  ];

  const carbonServices = dataset.services.map((s) =>
    computeCarbonImpact(s, allocation[s.id] ?? s.baselineFunding),
  );
  const carbonBaseline = round2(
    dataset.services.reduce((acc, s) => acc + s.baselineEmissionsTonnes, 0),
  );
  const carbonProjected = round2(carbonServices.reduce((acc, c) => acc + c.projectedTonnes, 0));
  const carbonDelta = round2(carbonProjected - carbonBaseline);

  const carbonFactors = [
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
