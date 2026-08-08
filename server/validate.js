// Input validation for API mutations.
//
// Rules enforced:
//   - allocation must be a plain object
//   - keys must all be known service IDs
//   - values must be finite non-negative numbers
//   - total payload size limited (Express body limit handles gross size;
//     we additionally cap allocation entries)
//   - name (for scenarios) required, non-empty, max length

export const MAX_SERVICES = 64;
export const MAX_NAME_LENGTH = 120;
export const MAX_FUNDING = 10_000_000_000; // $10B per-line cap

export function validateAllocation(dataset, allocation) {
  if (!allocation || typeof allocation !== "object" || Array.isArray(allocation)) {
    return { ok: false, error: "allocation must be an object" };
  }
  const keys = Object.keys(allocation);
  if (keys.length > MAX_SERVICES) {
    return { ok: false, error: `allocation has too many entries (max ${MAX_SERVICES})` };
  }
  const known = new Set(dataset.services.map((s) => s.id));
  for (const k of keys) {
    if (!known.has(k)) {
      return { ok: false, error: `unknown service id: ${k}` };
    }
    const v = allocation[k];
    if (typeof v !== "number" || !Number.isFinite(v)) {
      return { ok: false, error: `funding for ${k} must be a finite number` };
    }
    if (v < 0) {
      return { ok: false, error: `funding for ${k} cannot be negative` };
    }
    if (v > MAX_FUNDING) {
      return { ok: false, error: `funding for ${k} exceeds per-line cap` };
    }
  }
  return { ok: true };
}

export function validateScenarioCreate(dataset, body) {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "body must be an object" };
  }
  const { name, allocation } = body;
  if (typeof name !== "string" || name.trim().length === 0) {
    return { ok: false, error: "name is required" };
  }
  if (name.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `name exceeds ${MAX_NAME_LENGTH} characters` };
  }
  const a = validateAllocation(dataset, allocation);
  if (!a.ok) return a;
  return { ok: true };
}
