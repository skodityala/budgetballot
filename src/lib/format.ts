export const fmtMoney = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n)}`;
};

export const fmtSignedMoney = (n: number): string => (n >= 0 ? `+${fmtMoney(n)}` : `-${fmtMoney(-n)}`);

export const fmtPct = (n: number, digits = 0): string => `${n.toFixed(digits)}%`;

export const fmtTonnes = (n: number): string => {
  if (!Number.isFinite(n)) return "—";
  const rounded = Math.round(n);
  return `${rounded.toLocaleString()} tCO₂e`;
};

export const fmtSignedTonnes = (n: number): string =>
  n >= 0 ? `+${fmtTonnes(n)}` : `-${fmtTonnes(-n)}`;

export const fmtSignedPoints = (n: number): string =>
  n >= 0 ? `+${n.toFixed(1)}` : n.toFixed(1);

/**
 * Money spelled out for screen readers.
 *
 * `fmtMoney` produces compact display text ("$168.0M") which a screen reader
 * announces as "one hundred sixty eight point zero M" — precise-sounding but
 * meaningless. This produces "168 million dollars", which is what a person
 * would actually say. Used for aria-valuetext on the funding sliders so the
 * announced value is a dollar amount, not a raw number like "168000000".
 */
export const fmtMoneySpoken = (n: number): string => {
  if (!Number.isFinite(n)) return "unknown";
  const abs = Math.abs(n);
  const sign = n < 0 ? "minus " : "";
  if (abs >= 1_000_000_000) {
    const v = abs / 1_000_000_000;
    return `${sign}${trimZero(v)} billion dollars`;
  }
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${trimZero(v)} million dollars`;
  }
  if (abs >= 1_000) {
    const v = abs / 1_000;
    return `${sign}${trimZero(v)} thousand dollars`;
  }
  return `${sign}${Math.round(abs)} dollars`;
};

// 168 → "168", 168.5 → "168.5" (no trailing ".0" for the spoken form)
const trimZero = (v: number): string => {
  const s = v.toFixed(1);
  return s.endsWith(".0") ? s.slice(0, -2) : s;
};
