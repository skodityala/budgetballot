import { useId } from "react";
import type { CarbonImpact, ServiceImpact } from "../engine/types";
import { fmtMoney, fmtSignedTonnes, fmtSignedPoints } from "../lib/format";
import { FactorList } from "./ui";

export default function ImpactCard({
  service,
  carbon,
}: {
  service: ServiceImpact;
  carbon: CarbonImpact | undefined;
}) {
  const uid = useId();

  // The left border colour is decorative reinforcement only. The direction of
  // the outcome change is also stated in words + an arrow below, so the card is
  // fully readable in greyscale (WCAG 1.4.1).
  const improved = service.outcomeDelta > 0.5;
  const worsened = service.outcomeDelta < -0.5;
  const tone = improved
    ? "border-l-emerald-500"
    : worsened
      ? "border-l-rose-500"
      : "border-l-slate-300";
  const outcomeArrow = improved ? "▲" : worsened ? "▼" : "▬";
  const outcomeWord = improved ? "improved" : worsened ? "declined" : "unchanged";

  const carbonDown = carbon ? carbon.deltaTonnes < 0 : false;
  const carbonUp = carbon ? carbon.deltaTonnes > 0 : false;
  const carbonArrow = carbonDown ? "↓" : carbonUp ? "↑" : "→";
  const carbonWord = carbonDown ? "lower" : carbonUp ? "higher" : "unchanged";

  return (
    <section className={`card border-l-4 ${tone}`} aria-labelledby={`${uid}-name`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <h3 id={`${uid}-name`} className="font-medium text-ink text-base">
            {service.serviceName}
          </h3>
          <div className="text-xs text-slate-500">
            Funded at {fmtMoney(service.funding)} · {service.fundingStatus}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {service.projectedOutcome.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">
            baseline {service.baselineOutcome} ·{" "}
            <span aria-hidden="true">{outcomeArrow} </span>
            {fmtSignedPoints(service.outcomeDelta)}
          </div>
          <span className="sr-only">
            Outcome {outcomeWord}: {service.projectedOutcome.toFixed(1)} out of 100,
            {" "}from a baseline of {service.baselineOutcome}, a change of{" "}
            {fmtSignedPoints(service.outcomeDelta)} points.
          </span>
        </div>
      </div>

      {carbon ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Emissions</span>
          <span
            className={`tabular-nums font-medium ${
              carbonDown ? "text-emerald-700" : carbonUp ? "text-rose-700" : "text-slate-700"
            }`}
          >
            <span aria-hidden="true">{carbonArrow} </span>
            {fmtSignedTonnes(carbon.deltaTonnes)}
            <span className="sr-only"> — {carbonWord} than baseline</span>
          </span>
        </div>
      ) : null}

      {/* <details>/<summary> is natively keyboard-operable and exposes its
          expanded state to AT — no custom ARIA disclosure needed. */}
      <details className="mt-3 group">
        <summary className="text-xs text-slate-600 cursor-pointer select-none group-open:mb-2">
          Why this number? Show factors
          <span aria-hidden="true"> ↓</span>
        </summary>
        <div>
          <h4 className="text-xs uppercase tracking-wide text-slate-500 mt-2 font-normal">
            Service factors
          </h4>
          <FactorList factors={service.factors} />
          {carbon ? (
            <>
              <h4 className="text-xs uppercase tracking-wide text-slate-500 mt-3 font-normal">
                Carbon factors
              </h4>
              <FactorList factors={carbon.factors} />
            </>
          ) : null}
        </div>
      </details>
    </section>
  );
}
