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
  const tone =
    service.outcomeDelta > 0.5
      ? "border-l-emerald-500"
      : service.outcomeDelta < -0.5
        ? "border-l-rose-500"
        : "border-l-slate-300";

  return (
    <div className={`card border-l-4 ${tone}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="font-medium text-ink">{service.serviceName}</div>
          <div className="text-xs text-slate-500">
            Funded at {fmtMoney(service.funding)} · {service.fundingStatus}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular-nums">
            {service.projectedOutcome.toFixed(1)}
          </div>
          <div className="text-xs text-slate-500">
            baseline {service.baselineOutcome} · {fmtSignedPoints(service.outcomeDelta)}
          </div>
        </div>
      </div>

      {carbon ? (
        <div className="mt-3 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-600">Emissions</span>
          <span
            className={`tabular-nums font-medium ${
              carbon.deltaTonnes < 0
                ? "text-emerald-700"
                : carbon.deltaTonnes > 0
                  ? "text-rose-700"
                  : "text-slate-700"
            }`}
          >
            {fmtSignedTonnes(carbon.deltaTonnes)}
          </span>
        </div>
      ) : null}

      <details className="mt-3 group">
        <summary className="text-xs text-slate-600 cursor-pointer select-none group-open:mb-2">
          Why this number? Show factors ↓
        </summary>
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500 mt-2">Service factors</div>
          <FactorList factors={service.factors} />
          {carbon ? (
            <>
              <div className="text-xs uppercase tracking-wide text-slate-500 mt-3">Carbon factors</div>
              <FactorList factors={carbon.factors} />
            </>
          ) : null}
        </div>
      </details>
    </div>
  );
}
