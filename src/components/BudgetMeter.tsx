import { fmtMoney, fmtTonnes, fmtSignedTonnes, fmtSignedPoints } from "../lib/format";

// The three meters are the numbers that change as you drag a slider. Each one:
//
//  * wraps its changing readout in aria-live="polite" so a screen reader
//    announces the new value instead of leaving it silent (WCAG 4.1.3);
//  * carries role="img" + aria-label on the bar, because a bare coloured div
//    means nothing to AT;
//  * pairs every colour signal with a word or glyph (WCAG 1.4.1) — "OVER
//    BUDGET", "↓ lower"/"↑ higher", "better"/"worse" — so nothing depends on
//    hue alone.
//
// aria-live is on an inner wrapper, not the whole card: the static label must
// not be re-announced on every keystroke, only the value that changed.

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
    <section className="card" aria-labelledby="meter-budget-label">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="meter-budget-label"
          className="text-xs uppercase tracking-wide text-slate-500 font-normal"
        >
          Total allocated
        </h2>
        <div
          className={`text-sm font-medium ${overBudget ? "text-rose-700" : "text-slate-600"}`}
        >
          {/* Text, not just colour: the words carry the state. */}
          {overBudget ? "⚠ OVER BUDGET" : "✓ on budget"}
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {fmtMoney(totalAllocated)}{" "}
          <span className="text-base text-slate-500 font-normal">
            / {fmtMoney(totalBudget)}
          </span>
        </div>
        <span className="sr-only">
          {fmtMoney(totalAllocated)} of {fmtMoney(totalBudget)} allocated,{" "}
          {pct.toFixed(0)} percent.{" "}
          {overBudget ? "Over budget." : "Within budget."}
        </span>
      </div>
      <div
        className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={`Budget used: ${pct.toFixed(0)} percent`}
      >
        <div
          className={`h-full ${barColor} transition-all duration-300`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </section>
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
  const tone =
    deltaTonnes < 0 ? "text-emerald-700" : deltaTonnes > 0 ? "text-rose-700" : "text-slate-700";
  const bar =
    deltaTonnes < 0 ? "bg-emerald-500" : deltaTonnes > 0 ? "bg-rose-500" : "bg-slate-400";
  const ratio = projectedTonnes / Math.max(1, baselineTonnes);
  const barWidth = Math.max(4, Math.min(100, ratio * 60)); // baseline sits ~60%

  // Direction is an arrow + a word, so it reads in greyscale. Lower emissions
  // is the good direction — stated explicitly rather than implied by green.
  const arrow = deltaTonnes < 0 ? "↓" : deltaTonnes > 0 ? "↑" : "→";
  const word = deltaTonnes < 0 ? "lower" : deltaTonnes > 0 ? "higher" : "unchanged";

  return (
    <section className="card" aria-labelledby="meter-carbon-label">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="meter-carbon-label"
          className="text-xs uppercase tracking-wide text-slate-500 font-normal"
        >
          Annual emissions
        </h2>
        <div className={`text-sm font-medium ${tone}`}>
          <span aria-hidden="true">{arrow} </span>
          {fmtSignedTonnes(deltaTonnes)}
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="mt-1 text-2xl font-semibold tabular-nums">
          {fmtTonnes(projectedTonnes)}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          baseline: {fmtTonnes(baselineTonnes)} ·{" "}
          <span className={tone}>{word} than baseline</span>
        </div>
        <span className="sr-only">
          Projected annual emissions {fmtTonnes(projectedTonnes)}, {word} than the
          baseline of {fmtTonnes(baselineTonnes)}. Change:{" "}
          {fmtSignedTonnes(deltaTonnes)}.
        </span>
      </div>
      <div
        className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={`Emissions ${word} than baseline`}
      >
        <div
          className={`h-full ${bar} transition-all duration-300`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </section>
  );
}

export function EquityMeter({
  score,
  baselineScore,
  delta,
}: {
  score: number;
  baselineScore: number;
  delta: number;
}) {
  const tone = delta > 0 ? "text-emerald-700" : delta < 0 ? "text-rose-700" : "text-slate-700";
  const arrow = delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
  const word = delta > 0 ? "better" : delta < 0 ? "worse" : "unchanged";

  return (
    <section className="card" aria-labelledby="meter-equity-label">
      <div className="flex items-baseline justify-between gap-2">
        <h2
          id="meter-equity-label"
          className="text-xs uppercase tracking-wide text-slate-500 font-normal"
        >
          Equity score
        </h2>
        <div className={`text-sm font-medium ${tone}`}>
          <span aria-hidden="true">{arrow} </span>
          {fmtSignedPoints(delta)} pts
        </div>
      </div>
      <div aria-live="polite" aria-atomic="true">
        <div className="mt-1 text-2xl font-semibold tabular-nums">{score.toFixed(1)}</div>
        <div className="mt-1 text-xs text-slate-500">
          baseline: {baselineScore.toFixed(1)} ·{" "}
          <span className={tone}>{word} than baseline</span>
        </div>
        <span className="sr-only">
          Equity score {score.toFixed(1)} out of 100, {word} than the baseline of{" "}
          {baselineScore.toFixed(1)}. Change: {fmtSignedPoints(delta)} points.
        </span>
      </div>
      <div
        className="mt-3 h-3 rounded-full bg-slate-100 overflow-hidden"
        role="img"
        aria-label={`Equity score ${score.toFixed(1)} out of 100`}
      >
        <div
          className="h-full bg-sky-500 transition-all duration-300"
          style={{ width: `${score}%` }}
        />
      </div>
    </section>
  );
}
