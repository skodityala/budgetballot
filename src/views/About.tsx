export default function About() {
  return (
    <div className="grid gap-6 max-w-3xl">
      <section className="card">
        <h1 className="text-2xl font-bold text-ink">How the model works</h1>
        <p className="mt-3 text-slate-700 leading-relaxed">
          BudgetBallot is a <em>deterministic transparent model</em>, not a language model.
          Every impact number is computed from a documented formula, and every formula is
          decomposed into <code>Factor</code> entries you can click open on the Impact view.
          No opaque coefficients.
        </p>
      </section>

      <section className="card">
        <h2 className="font-semibold text-ink">The three coupled outputs</h2>
        <ul className="mt-2 list-disc list-inside text-slate-700 space-y-1">
          <li><strong>Service outcome (0–100)</strong> — piecewise-linear response to funding, with diminishing returns above the "effective cap."</li>
          <li><strong>Equity score (0–100)</strong> — weighted mean of service outcomes, weighted by each service's importance to underserved districts.</li>
          <li><strong>Annual emissions (tCO₂e)</strong> — per-service baseline scaled by a signed carbon elasticity. Some services <em>reduce</em> emissions when funded (transit, retrofits, parks); some <em>increase</em> them (road expansion, larger vehicle fleets).</li>
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold text-ink">Why two implementations of the same model?</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">
          The impact model lives twice in the codebase — as TypeScript in the browser (for instant slider
          feedback) and as JavaScript on the server (for API calls, scripting, and validation). An automated
          parity test runs both on the same inputs and fails loudly if they ever disagree. It's the safety
          net that makes it safe to iterate on the math.
        </p>
      </section>

      <section className="card">
        <h2 className="font-semibold text-ink">Data provenance</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">
          The seed dataset models a mid-size U.S. city (~250k residents, $1.2B general fund). Funding
          ranges were sanity-checked against publicly available city budget summaries. Per-service
          emissions are <em>illustrative parameters</em>, not sourced measurements — they capture the
          directional effect of funding shifts (transit and retrofits reduce emissions; road expansion
          and larger fleets raise them) at plausible magnitudes. Do not cite these numbers as
          authoritative.
        </p>
      </section>

      <section className="card">
        <h2 className="font-semibold text-ink">Security posture</h2>
        <p className="mt-2 text-slate-700 leading-relaxed">
          Reads are unauthenticated by design — this is a civic transparency tool and scenarios are meant
          to be shareable. Mutations (creating and deleting saved scenarios) require a shared-secret
          write key and are rate-limited per IP. Inputs are strictly validated. IDs use
          <code>crypto.randomUUID()</code>.
        </p>
      </section>
    </div>
  );
}
