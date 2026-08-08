import { ReactNode } from "react";

export function Stat({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-700"
      : tone === "bad"
        ? "text-rose-700"
        : tone === "warn"
          ? "text-amber-700"
          : "text-ink";
  return (
    <div className="card">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-1 text-xs text-slate-500">{sub}</div> : null}
    </div>
  );
}

export function FactorList({ factors }: { factors: { label: string; value: number; note?: string }[] }) {
  return (
    <ul className="mt-2 space-y-1 text-sm">
      {factors.map((f, i) => (
        <li key={i} className="flex flex-col sm:flex-row sm:justify-between sm:gap-4">
          <span className="text-slate-600">{f.label}</span>
          <span className="text-slate-800 tabular-nums font-medium">{formatFactor(f.value)}</span>
          {f.note ? <span className="basis-full text-xs text-slate-500">{f.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function formatFactor(v: number): string {
  if (!Number.isFinite(v)) return "—";
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (Math.abs(v) >= 1000) return v.toLocaleString();
  return String(v);
}
