import { ReactNode } from "react";
import { NavLink } from "react-router-dom";

const nav = [
  { to: "/", label: "Home", end: true },
  { to: "/allocate", label: "Allocate" },
  { to: "/impact", label: "Impact" },
  { to: "/compare", label: "Compare" },
  { to: "/about", label: "About" },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 font-semibold text-ink">
            <img src="/favicon.svg" alt="" className="h-6 w-6" />
            <span>BudgetBallot</span>
          </NavLink>
          <nav className="ml-auto flex gap-1 text-sm">
            {nav.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg transition ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
          <span>BudgetBallot — participatory budgeting with transparent service, equity, and carbon modeling.</span>
          <span>Every number shows its factors.</span>
        </div>
      </footer>
    </div>
  );
}
