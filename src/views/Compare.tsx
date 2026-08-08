import { useMemo, useState } from "react";
import StateBlock from "../components/StateBlock";
import type { UseScenario } from "../state/useScenario";
import { computeImpact } from "../engine/impact";
import type { Allocation } from "../engine/types";
import { fmtMoney, fmtTonnes, fmtSignedTonnes, fmtSignedPoints } from "../lib/format";

// Three canned comparison scenarios — user can swap "Your allocation" against each.
function presets(dataset: any): { name: string; alloc: Allocation }[] {
  const base: Allocation = {};
  for (const s of dataset.services) base[s.id] = s.baselineFunding;

  const transitFirst = { ...base };
  transitFirst.transit = base.transit * 1.4;
  transitFirst.energy = base.energy * 1.6;
  transitFirst.housing = base.housing * 1.1;
  transitFirst.roads = base.roads * 0.65;

  const roadsFirst = { ...base };
  roadsFirst.roads = base.roads * 1.6;
  roadsFirst.police = base.police * 1.15;
  roadsFirst.transit = base.transit * 0.8;

  const austerity: Allocation = {};
  for (const s of dataset.services) austerity[s.id] = s.baselineFunding * 0.75;

  return [
    { name: "Baseline", alloc: base },
    { name: "Transit-first / green", alloc: transitFirst },
    { name: "Roads-first", alloc: roadsFirst },
    { name: "Austerity (-25%)", alloc: austerity },
  ];
}

export default function Compare({ scenario }: { scenario: UseScenario }) {
  const { dataset, allocation, loading, error, loadAllocation } = scenario;
  const [selectedIdx, setSelectedIdx] = useState(1);

  const rows = useMemo(() => {
    if (!dataset) return [];
    const all = [{ name: "Your allocation", alloc: allocation }, ...presets(dataset)];
    return all.map((row) => {
      const r = computeImpact(dataset as any, row.alloc);
      return {
        ...row,
        totalAllocated: r.totalAllocated,
        overBudget: r.overBudget,
        equityScore: r.equity.score,
        equityDelta: r.equity.delta,
        carbonProjected: r.carbon.projectedTonnes,
        carbonDelta: r.carbon.deltaTonnes,
      };
    });
  }, [dataset, allocation]);

  return (
    <StateBlock loading={loading} error={error}>
      {dataset && (
        <div className="grid gap-4">
          <section className="card">
            <div className="text-xs uppercase tracking-wide text-slate-500">Compare</div>
            <div className="mt-1 font-medium text-ink">
              Your allocation versus three reference scenarios
            </div>
            <p className="mt-2 text-sm text-slate-600">
              This is the "trade-off table." Read across a row to see the cost of any given priority set.
            </p>
          </section>

          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Scenario</th>
                  <th className="py-2 pr-4 text-right">Allocated</th>
                  <th className="py-2 pr-4 text-right">Equity</th>
                  <th className="py-2 pr-4 text-right">Emissions</th>
                  <th className="py-2 pr-4 text-right">Δ emissions</th>
                  <th className="py-2 pr-0"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.name} className="border-b border-slate-100 last:border-b-0">
                    <td className="py-3 pr-4 font-medium">{row.name}</td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {fmtMoney(row.totalAllocated)}
                      {row.overBudget ? <span className="ml-1 text-xs text-rose-700">(over)</span> : null}
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">
                      {row.equityScore.toFixed(1)}{" "}
                      <span
                        className={`text-xs ${
                          row.equityDelta > 0
                            ? "text-emerald-700"
                            : row.equityDelta < 0
                              ? "text-rose-700"
                              : "text-slate-500"
                        }`}
                      >
                        ({fmtSignedPoints(row.equityDelta)})
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right tabular-nums">{fmtTonnes(row.carbonProjected)}</td>
                    <td
                      className={`py-3 pr-4 text-right tabular-nums ${
                        row.carbonDelta < 0
                          ? "text-emerald-700"
                          : row.carbonDelta > 0
                            ? "text-rose-700"
                            : "text-slate-700"
                      }`}
                    >
                      {fmtSignedTonnes(row.carbonDelta)}
                    </td>
                    <td className="py-3 pr-0 text-right">
                      {i > 0 && (
                        <button
                          className="btn text-xs"
                          onClick={() => {
                            loadAllocation(row.alloc);
                            setSelectedIdx(i);
                          }}
                        >
                          Load
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="text-xs text-slate-500">
            Loaded preset: <strong>{rows[selectedIdx]?.name ?? "—"}</strong>. Return to{" "}
            <a href="/allocate" className="underline">Allocate</a> to tune.
          </div>
        </div>
      )}
    </StateBlock>
  );
}
