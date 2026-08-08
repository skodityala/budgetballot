import { useEffect, useRef, useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Landing from "./views/Landing";
import Allocator from "./views/Allocator";
import Impact from "./views/Impact";
import Compare from "./views/Compare";
import About from "./views/About";
import { useScenario } from "./state/useScenario";

const TITLES: Record<string, string> = {
  "/": "BudgetBallot — transparent participatory budgeting",
  "/allocate": "Allocate the budget — BudgetBallot",
  "/impact": "Impact — BudgetBallot",
  "/compare": "Compare scenarios — BudgetBallot",
  "/about": "How the model works — BudgetBallot",
};

/**
 * In a single-page app, clicking a nav link swaps the DOM without a page load,
 * so screen readers say nothing and the user has no idea the view changed.
 * This does the two things a real page load would have done:
 *
 *   1. updates document.title (also what the browser history/tab shows), and
 *   2. announces the new view through a polite live region.
 *
 * It renders only an invisible live region, so it costs nothing visually.
 */
function RouteAnnouncer() {
  const { pathname } = useLocation();
  const [message, setMessage] = useState("");
  const isFirstRender = useRef(true);

  useEffect(() => {
    const title = TITLES[pathname] ?? "BudgetBallot";
    document.title = title;

    // Don't announce the very first render — the page just loaded and the
    // screen reader is already reading the document.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setMessage(`${title.split(" — ")[0]} view loaded`);
  }, [pathname]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only" role="status">
      {message}
    </div>
  );
}

export default function App() {
  const scenario = useScenario();
  return (
    <Layout>
      <RouteAnnouncer />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/allocate" element={<Allocator scenario={scenario} />} />
        <Route path="/impact" element={<Impact scenario={scenario} />} />
        <Route path="/compare" element={<Compare scenario={scenario} />} />
        <Route path="/about" element={<About />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
