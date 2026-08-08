import { fmtMoney, fmtTonnes, fmtSignedTonnes, fmtSignedPoints } from "../lib/format";

export function BudgetMeter({
  totalAllocated,
  totalBudget,
  overBudget,
}: {
  totalAllocated: number;
  totalBudget: number;
  overBudget: boolean;
}) {
  const pct = Math.min(200, (totalAllocated / totalBudget) * 100);
  const barColor = overBudget ? "bg-rose-500" : pct > 95 ? "bg-amber-500" : "bg-accent";
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Total allocated</div>
        <div className={`text-sm font-medium ${overBudget ? "text-rose-700" : "text-slate-600"}`}>
          {overBudget ? "OVER BUDGET" : "on budget"}
        </div>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">
        {fmtMoney(totalAllocated)} <span className="text-base text-slate-500 font-normal">/ {fmtMoney(totalBudget)}</span>
      </div>
      <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

export function CarbonMeter({
  baselineTonnes,
  projectedTonnes,
  deltaTonnes,
}: {
  baselineTonnes: number;
  projectedTonnes: number;
  deltaTonnes: number;
}) {
  const tone = deltaTonnes < 0 ? "text-emerald-700" : deltaTonnes > 0 ? "text-rose-700" : "text-slate-700";
  const bar = deltaTonnes < 0 ? "bg-emerald-500" : deltaTonnes > 0 ? "bg-rose-500" : "bg-slate-400";
  const ratio = projectedTonnes / Math.max(1, baselineTonnes);
  const barWidth = Math.max(4, Math.min(100, ratio * 60)); // scale so baseline sits around ~60%
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Annual emissions</div>
        <div className={`text-sm font-medium ${tone}`}>{fmtSignedTonnes(deltaTonnes)}</div>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{fmtTonnes(projectedTonnes)}</div>
      <div className="mt-1 text-xs text-slate-500">baseline: {fmtTonnes(baselineTonnes)}</div>
      <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full ${bar} transition-all duration-300`} style={{ width: `${barWidth}%` }} />
      </div>
    </div>
  );
}

export function EquityMeter({ score, baselineScore, delta }: { score: number; baselineScore: number; delta: number }) {
  const tone = delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-700";
  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-xs uppercase tracking-wide text-slate-500">Equity score</div>
        <div className={`text-sm font-medium ${tone}`}>{fmtSignedPoints(delta)} pts</div>
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{score.toFixed(1)}</div>
      <div className="mt-1 text-xs text-slate-500">baseline: {baselineScore.toFixed(1)}</div>
      <div className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden">
        <div className="h-full bg-sky-500 transition-all duration-300" style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}
