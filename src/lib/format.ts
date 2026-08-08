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
