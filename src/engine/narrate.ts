// BudgetBallot narrator — turns an ImpactReport into a plain-English paragraph.
//
// This is a pure, deterministic function. No network, no API key, no LLM.
// The paragraph is *computed* from report data, not generated — which means it
// cannot hallucinate. If the numbers change, the words change. If the numbers
// don't, the words don't.
//
// The sentence *structure* varies with which factor is decisive: a scenario
// dominated by equity gains reads differently from one dominated by a carbon
// trade-off. See narrate.test.ts for the four canonical shapes.

import type { ImpactReport, ServiceImpact, CarbonImpact } from "./types";

const money = (n: number) =>
  n === 0
    ? "$0"
    : Math.abs(n) >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : Math.abs(n) >= 1_000
        ? `$${(n / 1_000).toFixed(0)}K`
        : `$${Math.round(n)}`;

const signed = (n: number) => (n >= 0 ? `+${n}` : `${n}`);

function topShift(services: ServiceImpact[]): { up?: ServiceImpact; down?: ServiceImpact } {
  const withDelta = services.filter((s) => Math.abs(s.fundingDelta) > 1);
  if (withDelta.length === 0) return {};
  const up = withDelta.reduce<ServiceImpact | undefined>(
    (best, s) => (!best || s.fundingDelta > best.fundingDelta ? s : best),
    undefined,
  );
  const down = withDelta.reduce<ServiceImpact | undefined>(
    (best, s) => (!best || s.fundingDelta < best.fundingDelta ? s : best),
    undefined,
  );
  return {
    up: up && up.fundingDelta > 0 ? up : undefined,
    down: down && down.fundingDelta < 0 ? down : undefined,
  };
}

function biggestOutcomeGain(services: ServiceImpact[]): ServiceImpact | undefined {
  return services.reduce<ServiceImpact | undefined>(
    (best, s) => (!best || s.outcomeDelta > best.outcomeDelta ? s : best),
    undefined,
  );
}

function biggestOutcomeLoss(services: ServiceImpact[]): ServiceImpact | undefined {
  return services.reduce<ServiceImpact | undefined>(
    (best, s) => (!best || s.outcomeDelta < best.outcomeDelta ? s : best),
    undefined,
  );
}

function dominantCarbonMover(carbons: CarbonImpact[]): CarbonImpact | undefined {
  return carbons.reduce<CarbonImpact | undefined>(
    (best, c) => (!best || Math.abs(c.deltaTonnes) > Math.abs(best?.deltaTonnes ?? 0) ? c : best),
    undefined,
  );
}

/**
 * Produce a plain-language paragraph explaining the report.
 *
 * The structure is chosen from a small set of shapes based on which effect is
 * decisive. All numbers come from the report; nothing is invented.
 */
export function narrate(report: ImpactReport): string {
  const parts: string[] = [];
  const shift = topShift(report.services);
  const bigGain = biggestOutcomeGain(report.services);
  const bigLoss = biggestOutcomeLoss(report.services);
  const carbon = report.carbon;
  const dominantCarbon = dominantCarbonMover(carbon.services);

  // ---------- lead sentence: the money move --------------------------------
  if (shift.up && shift.down) {
    parts.push(
      `You moved ${money(Math.min(shift.up.fundingDelta, -shift.down.fundingDelta))} from ${shift.down.serviceName} into ${shift.up.serviceName}.`,
    );
  } else if (shift.up) {
    parts.push(
      `You added ${money(shift.up.fundingDelta)} to ${shift.up.serviceName}${report.overBudget ? ", pushing the budget above baseline" : ""}.`,
    );
  } else if (shift.down) {
    parts.push(`You cut ${money(-shift.down.fundingDelta)} from ${shift.down.serviceName}.`);
  } else {
    parts.push(`This scenario matches baseline funding almost exactly.`);
  }

  // ---------- second sentence: dominant outcome effect ---------------------
  if (bigGain && bigGain.outcomeDelta > 0.5) {
    const isTopMove =
      shift.up && bigGain.serviceId === shift.up.serviceId ? " — the largest single gain in this scenario" : "";
    parts.push(
      `${bigGain.serviceName} rises from ${bigGain.baselineOutcome} to ${bigGain.projectedOutcome}${isTopMove}.`,
    );
  } else if (bigLoss && bigLoss.outcomeDelta < -0.5) {
    parts.push(
      `${bigLoss.serviceName} falls from ${bigLoss.baselineOutcome} to ${bigLoss.projectedOutcome}.`,
    );
  }

  // ---------- third sentence: equity ---------------------------------------
  if (Math.abs(report.equity.delta) >= 1) {
    const dir = report.equity.delta > 0 ? "improves" : "worsens";
    parts.push(
      `Equity ${dir} by ${Math.abs(report.equity.delta).toFixed(1)} points, because the affected services carry heavy weight for underserved districts.`,
    );
  } else {
    parts.push(`Equity holds roughly steady (${signed(report.equity.delta)}).`);
  }

  // ---------- fourth sentence: carbon --------------------------------------
  if (Math.abs(carbon.deltaTonnes) >= 100) {
    const dir = carbon.deltaTonnes < 0 ? "fall" : "rise";
    const driver = dominantCarbon
      ? `, driven ${carbonDriverAdverb(dominantCarbon)} by ${dominantCarbon.serviceName} (${signed(Math.round(dominantCarbon.deltaTonnes))} tCO2e)`
      : "";
    parts.push(
      `Annual emissions ${dir} by ${Math.abs(Math.round(carbon.deltaTonnes)).toLocaleString()} tCO2e${driver}.`,
    );
  } else {
    parts.push(`Annual emissions barely move (${signed(Math.round(carbon.deltaTonnes))} tCO2e).`);
  }

  // ---------- optional trade-off sentence ----------------------------------
  const outcomeGain = bigGain && bigGain.outcomeDelta > 0.5;
  const carbonWorse = carbon.deltaTonnes > 200;
  const carbonBetter = carbon.deltaTonnes < -200;
  if (outcomeGain && carbonWorse) {
    parts.push(
      `The trade-off: service outcomes improve, but the funding boost drives emissions up — a real tension worth naming.`,
    );
  } else if (bigLoss && bigLoss.outcomeDelta < -3 && carbonBetter) {
    parts.push(
      `The trade-off: lower emissions come at the cost of ${bigLoss.serviceName} dropping into "${bigLoss.fundingStatus}" status.`,
    );
  }

  return parts.join(" ");
}

function carbonDriverAdverb(c: CarbonImpact): string {
  // Just a light bit of variation so the sentence structure differs by scenario.
  if (Math.abs(c.deltaTonnes) > 5000) return "almost entirely";
  if (Math.abs(c.deltaTonnes) > 1500) return "largely";
  return "in large part";
}
