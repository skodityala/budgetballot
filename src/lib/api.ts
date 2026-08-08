import type { Dataset, ImpactReport, Allocation, Scenario } from "../engine/types";

const BASE = "/api";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  async getDataset(): Promise<Dataset> {
    return j(await fetch(`${BASE}/dataset`));
  },
  async computeImpact(allocation: Allocation): Promise<ImpactReport> {
    return j(
      await fetch(`${BASE}/impact`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ allocation }),
      }),
    );
  },
  async listScenarios(): Promise<Scenario[]> {
    return j(await fetch(`${BASE}/scenarios`));
  },
  async getScenario(id: string): Promise<Scenario> {
    return j(await fetch(`${BASE}/scenarios/${id}`));
  },
  async createScenario(name: string, allocation: Allocation, writeKey: string): Promise<Scenario> {
    return j(
      await fetch(`${BASE}/scenarios`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-write-key": writeKey,
        },
        body: JSON.stringify({ name, allocation }),
      }),
    );
  },
};
