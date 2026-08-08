import { useId, useMemo, useState } from "react";
import type { Service } from "../engine/types";
import { fmtMoney, fmtMoneySpoken } from "../lib/format";

// Funding status is conveyed THREE ways, never colour alone (WCAG 1.4.1):
//   1. the status word ("boosted" / "steady" / "cut")
//   2. a shape glyph that survives greyscale and colour-blindness
//   3. background/text colour (the redundant cue)
const STATUS = {
  boosted: { label: "boosted", glyph: "▲", spoken: "boosted above baseline" },
  steady: { label: "steady", glyph: "▬", spoken: "steady at baseline" },
  cut: { label: "cut", glyph: "▼", spoken: "cut below baseline" },
} as const;

export default function ServiceSlider({
  service,
  value,
  status,
  onChange,
}: {
  service: Service;
  value: number;
  status: "boosted" | "steady" | "cut";
  onChange: (v: number) => void;
}) {
  const min = 0;
  const max = useMemo(() => service.maxEffectiveFunding * 1.2, [service.maxEffectiveFunding]);
  const [text, setText] = useState<string | null>(null);

  // Stable unique ids so <label for=...> binds correctly even with 12 sliders
  // on the page. useId is SSR-safe and collision-free.
  const uid = useId();
  const rangeId = `${uid}-range`;
  const textId = `${uid}-text`;
  const rangeHelpId = `${uid}-help`;

  const meta = STATUS[status];

  const commitText = () => {
    if (text == null) return;
    const cleaned = text.replace(/[^0-9.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n) && n >= 0) onChange(Math.round(n));
    setText(null);
  };

  return (
    // <section> + accessible name turns each card into a navigable landmark,
    // so a screen-reader user can jump between services directly.
    <section className="card" aria-labelledby={`${uid}-name`}>
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <h3 id={`${uid}-name`} className="font-medium text-ink text-base">
            {service.name}
          </h3>
          <div className="text-xs text-slate-500">{service.category}</div>
        </div>
        <span className={`chip-${status}`}>
          <span aria-hidden="true">{meta.glyph}</span>
          {meta.label}
          {/* Full phrasing for AT; the visible word stays terse. */}
          <span className="sr-only"> — {meta.spoken}</span>
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <label htmlFor={rangeId} className="sr-only">
          {service.name} funding
        </label>
        <input
          id={rangeId}
          type="range"
          min={min}
          max={max}
          step={100_000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
          // aria-valuetext overrides the raw number ("168000000") with a
          // spoken dollar amount plus the resulting funding status, so each
          // arrow-key press announces something meaningful.
          aria-valuetext={`${fmtMoneySpoken(value)}, ${meta.spoken}`}
          aria-describedby={rangeHelpId}
        />
        <label htmlFor={textId} className="sr-only">
          {service.name} funding in dollars, exact amount
        </label>
        <input
          id={textId}
          type="text"
          inputMode="numeric"
          className="w-28 text-right text-sm rounded-md ring-1 ring-slate-300 px-2 py-1 tabular-nums"
          value={text ?? fmtMoney(value)}
          onFocus={() => setText(String(Math.round(value)))}
          onChange={(e) => setText(e.target.value)}
          onBlur={commitText}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          }}
        />
      </div>

      {/* Referenced by aria-describedby: gives AT users the range context that
          sighted users read off the row below. */}
      <div id={rangeHelpId} className="mt-2 text-xs text-slate-500 flex justify-between">
        <span>
          min: {fmtMoney(service.minFunding)}
        </span>
        <span>baseline: {fmtMoney(service.baselineFunding)}</span>
        <span>eff. cap: {fmtMoney(service.maxEffectiveFunding)}</span>
      </div>
    </section>
  );
}
