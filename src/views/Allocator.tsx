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
            <button className="btn" onClick={reset}>Reset to baseline</button>
            <Link to="/impact" className="btn-primary">See full impact →</Link>
            <span className="text-xs text-slate-500 ml-auto">
              Move a slider — every number updates locally, no round-trip.
            </span>
          </div>

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
        </div>
      )}
    </StateBlock>
  );
}
