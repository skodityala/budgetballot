import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { computeImpact } from "../engine/impact";
import type { Allocation, Dataset, ImpactReport } from "../engine/types";

export interface UseScenario {
  dataset: Dataset | null;
  allocation: Allocation;
  report: ImpactReport | null;
  loading: boolean;
  error: string | null;
  setFunding: (serviceId: string, value: number) => void;
  reset: () => void;
  loadAllocation: (a: Allocation) => void;
}

export function useScenario(): UseScenario {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [allocation, setAllocation] = useState<Allocation>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const baselineRef = useRef<Allocation>({});

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const d = await api.getDataset();
        if (cancelled) return;
        const base: Allocation = {};
        for (const s of d.services) base[s.id] = s.baselineFunding;
        baselineRef.current = base;
        setDataset(d);
        setAllocation(base);
      } catch (e: any) {
        setError(e?.message ?? "failed to load dataset");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const report = useMemo<ImpactReport | null>(() => {
    if (!dataset) return null;
    // Compute locally for instant feedback (server engine agrees — parity test).
    return computeImpact(dataset, allocation);
  }, [dataset, allocation]);

  const setFunding = useCallback((serviceId: string, value: number) => {
    setAllocation((prev) => ({ ...prev, [serviceId]: Math.max(0, value) }));
  }, []);

  const reset = useCallback(() => {
    setAllocation({ ...baselineRef.current });
  }, []);

  const loadAllocation = useCallback((a: Allocation) => {
    setAllocation({ ...a });
  }, []);

  return { dataset, allocation, report, loading, error, setFunding, reset, loadAllocation };
}
