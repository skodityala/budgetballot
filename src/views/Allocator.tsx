import { Link } from "react-router-dom";
import { BudgetMeter, CarbonMeter, EquityMeter } from "../components/BudgetMeter";
import ServiceSlider from "../components/ServiceSlider";
import StateBlock from "../components/StateBlock";
import type { UseScenario } from "../state/useScenario";
import { fundingStatus } from "../engine/impact";

export default function Allocator({ scenario }: { scenario: UseScenario }) {
  const { dataset, allocation, report, loading, error, setFunding, reset } = scenario;

  return (
    <StateBlock loading={loading} error={error}>
      {dataset && report && (
        <div className="grid gap-6">
          {/* Exactly one h1 per view. Headings then descend h1 → h2 (meters,
              section titles) → h3 (per-service cards) with no skipped levels. */}
          <div>
            <h1 className="text-2xl font-bold text-ink">Allocate the budget</h1>
            <p className="mt-1 text-sm text-slate-600">
              Move any slider. Service outcomes, the equity score, and annual
              emissions all update together — computed locally, no round-trip.
            </p>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <BudgetMeter
              totalAllocated={report.totalAllocated}
              totalBudget={report.totalBudget}
              overBudget={report.overBudget}
            />
            <EquityMeter
              score={report.equity.score}
              baselineScore={report.equity.baselineScore}
              delta={report.equity.delta}
            />
            <CarbonMeter
              baselineTonnes={report.carbon.baselineTonnes}
              projectedTonnes={report.carbon.projectedTonnes}
              deltaTonnes={report.carbon.deltaTonnes}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className="btn" onClick={reset}>
              Reset to baseline
            </button>
            <Link to="/impact" className="btn-primary">
              See full impact <span aria-hidden="true">→</span>
            </Link>
          </div>

          <section aria-labelledby="services-heading" className="grid gap-4">
            <h2 id="services-heading" className="sr-only">
              Service funding sliders
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {dataset.services.map((s) => (
                <ServiceSlider
                  key={s.id}
                  service={s}
                  value={allocation[s.id] ?? s.baselineFunding}
                  status={fundingStatus(s, allocation[s.id] ?? s.baselineFunding)}
                  onChange={(v) => setFunding(s.id, v)}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </StateBlock>
  );
}
