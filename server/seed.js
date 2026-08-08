// Seed dataset for BudgetBallot.
//
// DATA PROVENANCE
// ---------------
// Figures are realistic, round-number illustrations modeled on a mid-size U.S.
// city (~250k residents, ~$1.2B general fund). Ranges for department shares
// were sanity-checked against publicly published city budget summaries
// (Boulder CO, Berkeley CA, Cambridge MA are all in this rough size class).
// Per-service emissions are illustrative parameters, not sourced measurements;
// they capture the *directional* effect of funding shifts (transit and parks
// reduce emissions, road expansion and fleet growth raise them) at plausible
// magnitudes. Do not cite these numbers as authoritative.
//
// This file is the single source of truth for the seed. server/store.js hydrates
// its persistence from this object on first boot.

/** @type {import("../src/engine/types").Dataset} */
export const dataset = {
  city: "Ridgeport",
  year: 2026,
  population: 248000,
  totalBudget: 1_200_000_000, // $1.2B general fund
  baselineEmissionsTonnes: 187_500,
  notes:
    "Illustrative mid-size U.S. city. Figures are round-number parameters, not sourced measurements — see file header.",
  services: [
    {
      id: "transit",
      name: "Public Transit",
      category: "Mobility",
      baselineFunding: 168_000_000,
      minFunding: 80_000_000,
      maxEffectiveFunding: 260_000_000,
      baselineOutcome: 61,
      elasticity: 0.75,
      equityWeight: 0.95,
      baselineEmissionsTonnes: 42_000,
      carbonElasticity: 0.55,
      carbonDirection: "reduces",
      carbonRationale:
        "expanded service pulls trips out of private vehicles; each additional bus-mile displaces roughly 3-5 car-miles at typical urban ridership.",
    },
    {
      id: "roads",
      name: "Road Expansion & Maintenance",
      category: "Mobility",
      baselineFunding: 96_000_000,
      minFunding: 40_000_000,
      maxEffectiveFunding: 180_000_000,
      baselineOutcome: 72,
      elasticity: 0.55,
      equityWeight: 0.35,
      baselineEmissionsTonnes: 38_000,
      carbonElasticity: 0.40,
      carbonDirection: "increases",
      carbonRationale:
        "induced demand — added lane-miles increase total vehicle-miles-traveled within 5-10 years.",
    },
    {
      id: "housing",
      name: "Affordable Housing",
      category: "Community",
      baselineFunding: 140_000_000,
      minFunding: 60_000_000,
      maxEffectiveFunding: 240_000_000,
      baselineOutcome: 48,
      elasticity: 0.70,
      equityWeight: 0.90,
      baselineEmissionsTonnes: 22_000,
      carbonElasticity: 0.35,
      carbonDirection: "reduces",
      carbonRationale:
        "denser infill and retrofits lower per-household energy use relative to sprawl alternatives.",
    },
    {
      id: "parks",
      name: "Parks & Urban Forestry",
      category: "Environment",
      baselineFunding: 48_000_000,
      minFunding: 20_000_000,
      maxEffectiveFunding: 90_000_000,
      baselineOutcome: 68,
      elasticity: 0.60,
      equityWeight: 0.55,
      baselineEmissionsTonnes: 6_000,
      carbonElasticity: 0.50,
      carbonDirection: "reduces",
      carbonRationale:
        "tree canopy sequesters carbon and reduces cooling loads on nearby buildings.",
    },
    {
      id: "police",
      name: "Police Services",
      category: "Safety",
      baselineFunding: 180_000_000,
      minFunding: 90_000_000,
      maxEffectiveFunding: 260_000_000,
      baselineOutcome: 64,
      elasticity: 0.35,
      equityWeight: 0.45,
      baselineEmissionsTonnes: 8_500,
      carbonElasticity: 0.20,
      carbonDirection: "increases",
      carbonRationale:
        "larger vehicle fleets and expanded facilities raise fuel and building energy use.",
    },
    {
      id: "fire",
      name: "Fire & EMS",
      category: "Safety",
      baselineFunding: 110_000_000,
      minFunding: 70_000_000,
      maxEffectiveFunding: 160_000_000,
      baselineOutcome: 78,
      elasticity: 0.40,
      equityWeight: 0.70,
      baselineEmissionsTonnes: 5_500,
      carbonElasticity: 0.15,
      carbonDirection: "increases",
      carbonRationale:
        "more stations and apparatus modestly increase energy use, though response-time gains save lives.",
    },
    {
      id: "schools",
      name: "Public Schools Supplement",
      category: "Education",
      baselineFunding: 155_000_000,
      minFunding: 90_000_000,
      maxEffectiveFunding: 240_000_000,
      baselineOutcome: 66,
      elasticity: 0.65,
      equityWeight: 0.85,
      baselineEmissionsTonnes: 14_000,
      carbonElasticity: 0.25,
      carbonDirection: "neutral",
      carbonRationale:
        "school facility emissions scale slowly with funding; efficiency retrofits and expansion roughly cancel out.",
    },
    {
      id: "health",
      name: "Public Health & Clinics",
      category: "Health",
      baselineFunding: 88_000_000,
      minFunding: 45_000_000,
      maxEffectiveFunding: 160_000_000,
      baselineOutcome: 58,
      elasticity: 0.70,
      equityWeight: 0.90,
      baselineEmissionsTonnes: 9_500,
      carbonElasticity: 0.20,
      carbonDirection: "neutral",
      carbonRationale:
        "clinic operations dominate emissions; funding changes affect access far more than emissions.",
    },
    {
      id: "sanitation",
      name: "Waste & Recycling",
      category: "Environment",
      baselineFunding: 65_000_000,
      minFunding: 35_000_000,
      maxEffectiveFunding: 110_000_000,
      baselineOutcome: 70,
      elasticity: 0.50,
      equityWeight: 0.60,
      baselineEmissionsTonnes: 18_000,
      carbonElasticity: 0.40,
      carbonDirection: "reduces",
      carbonRationale:
        "expanded recycling and composting diverts organics from landfill, cutting fugitive methane.",
    },
    {
      id: "energy",
      name: "Efficiency Retrofits",
      category: "Environment",
      baselineFunding: 42_000_000,
      minFunding: 15_000_000,
      maxEffectiveFunding: 120_000_000,
      baselineOutcome: 52,
      elasticity: 0.80,
      equityWeight: 0.65,
      baselineEmissionsTonnes: 15_000,
      carbonElasticity: 0.75,
      carbonDirection: "reduces",
      carbonRationale:
        "building retrofits (heat pumps, insulation, LED, solar) are among the most cost-effective municipal decarbonization levers.",
    },
    {
      id: "admin",
      name: "General Administration",
      category: "Governance",
      baselineFunding: 62_000_000,
      minFunding: 40_000_000,
      maxEffectiveFunding: 100_000_000,
      baselineOutcome: 74,
      elasticity: 0.30,
      equityWeight: 0.30,
      baselineEmissionsTonnes: 4_500,
      carbonElasticity: 0.10,
      carbonDirection: "neutral",
      carbonRationale:
        "office operations; emissions are near-flat across the funding range.",
    },
    {
      id: "libraries",
      name: "Libraries & Community Centers",
      category: "Community",
      baselineFunding: 46_000_000,
      minFunding: 20_000_000,
      maxEffectiveFunding: 90_000_000,
      baselineOutcome: 71,
      elasticity: 0.55,
      equityWeight: 0.75,
      baselineEmissionsTonnes: 4_500,
      carbonElasticity: 0.15,
      carbonDirection: "neutral",
      carbonRationale:
        "shared civic space; emissions are largely fixed by building footprint.",
    },
  ],
};

/** Convenience: an allocation object that mirrors baseline funding exactly. */
export function baselineAllocation() {
  const a = {};
  for (const s of dataset.services) a[s.id] = s.baselineFunding;
  return a;
}
