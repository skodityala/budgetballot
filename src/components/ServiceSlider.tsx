import { useMemo, useState } from "react";
import type { Service } from "../engine/types";
import { fmtMoney } from "../lib/format";

const STATUS_LABEL = {
  boosted: "boosted",
  steady: "steady",
  cut: "cut",
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

  const commitText = () => {
    if (text == null) return;
    const cleaned = text.replace(/[^0-9.]/g, "");
    const n = Number(cleaned);
    if (Number.isFinite(n) && n >= 0) onChange(Math.round(n));
    setText(null);
  };

  return (
    <div className="card">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <div className="font-medium text-ink">{service.name}</div>
          <div className="text-xs text-slate-500">{service.category}</div>
        </div>
        <span className={`chip-${status}`}>{STATUS_LABEL[status]}</span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <input
          type="range"
          min={min}
          max={max}
          step={100_000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1 accent-teal-600"
          aria-label={`${service.name} funding`}
        />
        <input
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
          aria-label={`${service.name} funding, dollars`}
        />
      </div>

      <div className="mt-2 text-xs text-slate-500 flex justify-between">
        <span>min: {fmtMoney(service.minFunding)}</span>
        <span>baseline: {fmtMoney(service.baselineFunding)}</span>
        <span>eff. cap: {fmtMoney(service.maxEffectiveFunding)}</span>
      </div>
    </div>
  );
}
