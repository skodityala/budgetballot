// Shared engine types. See ARCHITECTURE.md for the model description.
//
// Every number the engine produces is decomposed into `Factor` entries so the
// UI (and the narrator) can show *why* a number came out the way it did.
// This is the entire point of the product: no opaque coefficients.

export type FundingStatus = "boosted" | "steady" | "cut";

/** Direction of a service's emissions response to funding.
 *  - "reduces": more funding lowers CO2e (transit, parks, efficiency retrofits)
 *  - "increases": more funding raises CO2e (road expansion, fleet growth)
 *  - "neutral": funding does not materially change CO2e (admin, records) */
export type CarbonDirection = "reduces" | "increases" | "neutral";

export interface Service {
  id: string;
  name: string;
  category: string;
  /** Recommended annual funding, in dollars. Slider "steady" point. */
  baselineFunding: number;
  /** Minimum funding to keep the service alive (below this it's "cut"). */
  minFunding: number;
  /** Funding beyond which additional dollars have sharply diminishing returns. */
  maxEffectiveFunding: number;
  /** Baseline service outcome, 0..100. Where the service performs at baseline funding. */
  baselineOutcome: number;
  /** How responsive outcomes are to funding changes. Typical 0.3..0.9. */
  elasticity: number;
  /** Equity weight, 0..1. Higher = more important to underserved districts. */
  equityWeight: number;
  /** Baseline annual CO2e in metric tons attributable to this service. */
  baselineEmissionsTonnes: number;
  /** How emissions respond to funding. Typical 0.2..0.9. */
  carbonElasticity: number;
  /** Whether more funding reduces or increases emissions. */
  carbonDirection: CarbonDirection;
  /** Short human-readable description of *why* funding moves emissions this way. */
  carbonRationale: string;
}

export interface Dataset {
  city: string;
  year: number;
  population: number;
  totalBudget: number;
  services: Service[];
  /** Baseline city-wide emissions (tCO2e/year) attributable to modeled services. */
  baselineEmissionsTonnes: number;
  notes: string;
}

export interface Allocation {
  [serviceId: string]: number;
}

export interface Scenario {
  id: string;
  name: string;
  createdAt: string;
  allocation: Allocation;
}

/** A single line of evidence contributing to a computed number. */
export interface Factor {
  label: string;
  /** Signed contribution in the same units as the parent metric. */
  value: number;
  /** Optional short note explaining the factor. */
  note?: string;
}

export interface CarbonImpact {
  serviceId: string;
  serviceName: string;
  baselineTonnes: number;
  projectedTonnes: number;
  deltaTonnes: number;
  direction: CarbonDirection;
  factors: Factor[];
}

export interface ServiceImpact {
  serviceId: string;
  serviceName: string;
  funding: number;
  fundingDelta: number;
  fundingStatus: FundingStatus;
  baselineOutcome: number;
  projectedOutcome: number;
  outcomeDelta: number;
  factors: Factor[];
}

export interface ImpactReport {
  totalAllocated: number;
  totalBudget: number;
  overBudget: boolean;
  services: ServiceImpact[];
  equity: {
    score: number;
    baselineScore: number;
    delta: number;
    factors: Factor[];
  };
  carbon: {
    baselineTonnes: number;
    projectedTonnes: number;
    deltaTonnes: number;
    services: CarbonImpact[];
    factors: Factor[];
  };
}
