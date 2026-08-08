// Accessibility regression tests.
//
// These don't render React (no jsdom in the dependency tree, and adding a
// headless browser conflicts with the no-new-runtime-deps constraint). Instead
// they lock in the two things that are cheap to verify statically and easy to
// regress silently:
//
//   1. Contrast — every colour pair actually used in the UI, checked against
//      the real WCAG 2.1 relative-luminance formula. This is what caught the
//      accent colour failing at 3.03:1.
//   2. Source invariants — one h1 per view, no bare outline suppression,
//      aria-valuetext on the sliders, live regions on the meters, and a
//      skip link in the layout.
//
// If someone "tidies up" an aria attribute or picks a prettier-but-lighter
// accent, these fail instead of shipping an inaccessible UI.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fmtMoneySpoken } from "../lib/format";

const SRC = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(SRC, p), "utf8");

/**
 * Read a source file with comments stripped.
 *
 * Needed because several of these files *document* the ARIA attributes they use
 * in a header comment, which would otherwise be counted as real occurrences.
 * Counting assertions must look at code only.
 */
const readCode = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments
    .replace(/^\s*\/\/.*$/gm, ""); // line comments

// ---------------------------------------------------------------- contrast ---

/** WCAG 2.1 relative luminance. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const channel = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4);
}

/** WCAG 2.1 contrast ratio, 1..21. */
function contrast(fg: string, bg: string): number {
  const a = luminance(fg);
  const b = luminance(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

const WHITE = "#ffffff";
const PALETTE = {
  ink: "#0f172a",
  accent: "#0f766e", // teal-700 — MUST stay dark enough for white text
  teal800: "#115e59",
  slate500: "#64748b",
  slate600: "#475569",
  slate700: "#334155",
  slate800: "#1e293b",
  slate900: "#0f172a",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  emerald700: "#047857",
  emerald50: "#ecfdf5",
  rose700: "#be123c",
  rose50: "#fff1f2",
  amber700: "#b45309",
};

describe("contrast (WCAG 2.1 AA)", () => {
  it("computes known reference ratios correctly", () => {
    // Sanity-check the implementation against values with known answers.
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 1);
    expect(contrast("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });

  // 4.5:1 is the AA threshold for normal-size text.
  const normalText: [string, string, string][] = [
    ["body text (slate-600 on white)", PALETTE.slate600, WHITE],
    ["secondary text (slate-500 on white)", PALETTE.slate500, WHITE],
    ["prose (slate-700 on white)", PALETTE.slate700, WHITE],
    ["headings (ink on white)", PALETTE.ink, WHITE],
    ["button label (slate-800 on white)", PALETTE.slate800, WHITE],
    ["accent eyebrow (accent on white)", PALETTE.accent, WHITE],
    ["primary button (white on accent)", WHITE, PALETTE.accent],
    ["primary button hover (white on teal-800)", WHITE, PALETTE.teal800],
    ["active nav (white on slate-900)", WHITE, PALETTE.slate900],
    ["boosted chip (emerald-700 on emerald-50)", PALETTE.emerald700, PALETTE.emerald50],
    ["cut chip (rose-700 on rose-50)", PALETTE.rose700, PALETTE.rose50],
    ["steady chip (slate-700 on slate-100)", PALETTE.slate700, PALETTE.slate100],
    ["emissions down (emerald-700 on slate-50)", PALETTE.emerald700, PALETTE.slate50],
    ["emissions up (rose-700 on slate-50)", PALETTE.rose700, PALETTE.slate50],
    ["over-budget (rose-700 on white)", PALETTE.rose700, WHITE],
    ["warning (amber-700 on white)", PALETTE.amber700, WHITE],
  ];

  it.each(normalText)("%s meets 4.5:1", (_label, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("the accent colour is dark enough for white text (regression)", () => {
    // The original #0ea5a4 measured 3.03:1 and failed AA for normal text.
    // This test exists so nobody swaps it back for a brighter teal.
    expect(contrast(WHITE, PALETTE.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", "#0ea5a4")).toBeLessThan(4.5); // documents why
  });

  it("the focus ring is visible against the page background", () => {
    // WCAG 1.4.11 non-text contrast: 3:1 for UI component boundaries.
    expect(contrast(PALETTE.accent, WHITE)).toBeGreaterThanOrEqual(3);
  });
});

// -------------------------------------------------- spoken money formatting --

describe("fmtMoneySpoken (slider aria-valuetext)", () => {
  it("speaks millions the way a person would", () => {
    expect(fmtMoneySpoken(168_000_000)).toBe("168 million dollars");
    expect(fmtMoneySpoken(1_500_000)).toBe("1.5 million dollars");
  });

  it("handles billions, thousands and small amounts", () => {
    expect(fmtMoneySpoken(1_200_000_000)).toBe("1.2 billion dollars");
    expect(fmtMoneySpoken(250_000)).toBe("250 thousand dollars");
    expect(fmtMoneySpoken(0)).toBe("0 dollars");
  });

  it("never emits a raw unpunctuated number or a trailing .0", () => {
    for (const v of [0, 1, 999, 1000, 42_000_000, 168_000_000, 1_000_000_000]) {
      const s = fmtMoneySpoken(v);
      expect(s).toMatch(/dollars$/);
      expect(s).not.toMatch(/\.0 /);
    }
  });

  it("degrades safely on non-finite input", () => {
    expect(fmtMoneySpoken(Number.NaN)).toBe("unknown");
    expect(fmtMoneySpoken(Number.POSITIVE_INFINITY)).toBe("unknown");
  });
});

// ------------------------------------------------------- source invariants ---

describe("semantic structure", () => {
  const views = ["Landing", "Allocator", "Impact", "Compare", "About"];

  it.each(views)("%s.tsx has exactly one h1", (view) => {
    const src = read(`views/${view}.tsx`);
    expect(src.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
  });

  it("never suppresses focus outlines without a replacement", () => {
    for (const f of ["index.css"]) {
      const css = read(f);
      // Strip comments before looking for real declarations.
      const code = css.replace(/\/\*[\s\S]*?\*\//g, "");
      expect(code).not.toMatch(/outline:\s*none/);
      expect(code).not.toMatch(/outline:\s*0/);
    }
  });

  it("defines a focus-visible ring and honours prefers-reduced-motion", () => {
    const css = read("index.css");
    expect(css).toMatch(/:focus-visible/);
    expect(css).toMatch(/prefers-reduced-motion/);
    expect(css).toMatch(/\.sr-only/);
  });

  it("Layout provides a skip-to-content link and a main landmark", () => {
    const src = read("components/Layout.tsx");
    expect(src).toMatch(/skip-link/);
    expect(src).toMatch(/id="main"/);
    expect(src).toMatch(/<main/);
    expect(src).toMatch(/aria-label="Main"/);
  });
});

describe("assistive-technology affordances", () => {
  it("sliders announce a dollar amount, not a raw number", () => {
    const src = read("components/ServiceSlider.tsx");
    expect(src).toMatch(/aria-valuetext/);
    expect(src).toMatch(/fmtMoneySpoken/);
    // A real <label> bound to the range input.
    expect(src).toMatch(/htmlFor=\{rangeId\}/);
  });

  it("funding status is conveyed by glyph and word, not colour alone", () => {
    const src = read("components/ServiceSlider.tsx");
    for (const glyph of ["▲", "▬", "▼"]) expect(src).toContain(glyph);
    for (const word of ["boosted", "steady", "cut"]) expect(src).toContain(word);
  });

  it("the three meters wrap their changing readouts in live regions", () => {
    const src = readCode("components/BudgetMeter.tsx");
    expect(src.match(/aria-live="polite"/g) ?? []).toHaveLength(3);
    // Bars are not bare coloured divs.
    expect(src.match(/role="img"/g) ?? []).toHaveLength(3);
  });

  it("carbon and equity direction is stated in words", () => {
    const src = read("components/BudgetMeter.tsx");
    expect(src).toMatch(/lower/);
    expect(src).toMatch(/higher/);
    expect(src).toMatch(/unchanged/);
  });

  it("the Impact narration is announced when it changes", () => {
    const src = read("views/Impact.tsx");
    expect(src).toMatch(/aria-live="polite"/);
  });

  it("route changes are announced to screen readers", () => {
    const src = read("App.tsx");
    expect(src).toMatch(/aria-live="polite"/);
    expect(src).toMatch(/document\.title/);
  });

  it("the comparison table is properly associated", () => {
    const src = read("views/Compare.tsx");
    expect(src).toMatch(/<caption/);
    expect(src).toMatch(/scope="col"/);
    expect(src).toMatch(/scope="row"/);
  });

  it("uses real buttons with explicit type", () => {
    for (const f of ["views/Allocator.tsx", "views/Compare.tsx"]) {
      const src = readCode(f);
      const buttons = src.match(/<button/g) ?? [];
      const typed = src.match(/type="button"/g) ?? [];
      expect(typed.length).toBe(buttons.length);
    }
  });
});
