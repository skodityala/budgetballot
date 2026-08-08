// Simple JSON-file scenario store.
//
// - IDs generated via crypto.randomUUID() (no Math.random)
// - File writes are atomic (write-temp + rename) to survive interrupted saves
// - In-memory index for O(1) reads
// - Data directory is .gitignore'd (server/data/); we rehydrate from seed.js
//   on cold start if the file is missing.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dataset, baselineAllocation } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Overridable so a deploy can point at a writable volume (e.g. Render disk at
// /var/data). Defaults to server/data/ for local dev.
const DATA_DIR = process.env.BUDGETBALLOT_DATA_DIR
  ? path.resolve(process.env.BUDGETBALLOT_DATA_DIR)
  : path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "scenarios.json");

// Some hosts (Vercel and other serverless/containerised runtimes) give you a
// read-only or ephemeral filesystem. Rather than 500 on every write, we fall
// back to in-memory-only persistence and say so once in the log. Scenarios
// then live for the lifetime of the process — reads, impact and the whole UI
// keep working, which is what a demo actually needs.
let ephemeral = false;

function degradeToMemory(err) {
  if (!ephemeral) {
    ephemeral = true;
    // eslint-disable-next-line no-console
    console.warn(
      `[budgetballot] filesystem is not writable (${err?.code || err?.message}) — ` +
        `scenarios will persist in memory only for this process. ` +
        `Set BUDGETBALLOT_DATA_DIR to a writable path for durable storage.`,
    );
  }
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function defaultScenarios() {
  return [
    {
      id: randomUUID(),
      name: "Baseline",
      createdAt: new Date().toISOString(),
      allocation: baselineAllocation(),
    },
  ];
}

function readFromDisk() {
  try {
    ensureDir();
  } catch (err) {
    degradeToMemory(err);
    return defaultScenarios();
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seeded = defaultScenarios();
    writeToDisk(seeded);
    return seeded;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("Corrupt scenarios file");
    return parsed;
  } catch (err) {
    // Corruption fallback: back the bad file up and reseed.
    const backup = `${DATA_FILE}.corrupt-${Date.now()}`;
    try {
      fs.renameSync(DATA_FILE, backup);
    } catch { /* ignore */ }
    const seeded = defaultScenarios();
    writeToDisk(seeded);
    return seeded;
  }
}

function writeToDisk(scenarios) {
  if (ephemeral) return; // already known read-only; don't retry on every write
  try {
    ensureDir();
    const tmp = `${DATA_FILE}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, JSON.stringify(scenarios, null, 2), "utf8");
    fs.renameSync(tmp, DATA_FILE);
  } catch (err) {
    // EROFS / EACCES / EPERM on a read-only or sandboxed FS. Keep serving.
    degradeToMemory(err);
  }
}

export function createStore() {
  let scenarios = readFromDisk();

  return {
    getDataset() {
      return dataset;
    },
    list() {
      return scenarios.slice();
    },
    get(id) {
      return scenarios.find((s) => s.id === id) || null;
    },
    create({ name, allocation }) {
      const scenario = {
        id: randomUUID(),
        name: String(name).slice(0, 120),
        createdAt: new Date().toISOString(),
        allocation,
      };
      scenarios = [scenario, ...scenarios].slice(0, 200); // cap to prevent unbounded growth
      writeToDisk(scenarios);
      return scenario;
    },
    remove(id) {
      const before = scenarios.length;
      scenarios = scenarios.filter((s) => s.id !== id);
      if (scenarios.length !== before) {
        writeToDisk(scenarios);
        return true;
      }
      return false;
    },
    /** Test-only: reset in-memory + disk state. */
    _reset() {
      scenarios = defaultScenarios();
      writeToDisk(scenarios);
    },
  };
}
