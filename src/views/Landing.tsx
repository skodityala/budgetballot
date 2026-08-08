import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="grid gap-6">
      <section className="card p-8">
        <div className="max-w-3xl">
          <div className="text-xs uppercase tracking-widest text-accent font-semibold">
            NextGen Innovation 2026 · Smart Cities &amp; Sustainability
          </div>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-ink leading-tight">
            Every other entry uses AI to <em className="not-italic underline decoration-accent">decide</em> for you.
            <br />
            BudgetBallot shows you <em className="not-italic underline decoration-accent">why.</em>
          </h1>
          <p className="mt-4 text-slate-600 text-lg leading-relaxed">
            A participatory budgeting simulator that lets any citizen allocate a city's budget across services
            and see — transparently, with every factor shown — the projected impact on{" "}
            <span className="font-medium text-ink">service outcomes</span>,{" "}
            <span className="font-medium text-ink">equity</span>, and{" "}
            <span className="font-medium text-ink">carbon emissions</span>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/allocate" className="btn-primary">Try the allocator →</Link>
            <Link to="/about" className="btn">How the model works</Link>
          </div>
        </div>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Transparent</div>
          <div className="mt-1 font-semibold text-ink">Every number shows its factors.</div>
          <p className="mt-2 text-sm text-slate-600">
            No opaque coefficients. Click any impact number and see exactly which inputs produced it.
          </p>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Verifiable</div>
          <div className="mt-1 font-semibold text-ink">Dual-implementation parity.</div>
          <p className="mt-2 text-sm text-slate-600">
            The impact model exists twice — in TypeScript (client) and JavaScript (server) — and an
            automated parity test proves they agree on every input.
          </p>
        </div>
        <div className="card">
          <div className="text-xs uppercase tracking-wide text-slate-500">Coupled</div>
          <div className="mt-1 font-semibold text-ink">Budget vs. climate, side by side.</div>
          <p className="mt-2 text-sm text-slate-600">
            Move a slider; three numbers move together — service outcome, equity, and annual tCO₂e.
            The trade-offs cities actually face, made visible.
          </p>
        </div>
      </section>
    </div>
  );
}
