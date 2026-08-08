// Ambient module declarations for the JS server files so the TS engine and
// tests can import from them without full re-typing. The runtime shapes match
// the TypeScript types in src/engine/types.ts (this is enforced by parity.test).

declare module "../../server/seed.js" {
  import type { Dataset, Allocation } from "./types";
  export const dataset: Dataset;
  export function baselineAllocation(): Allocation;
}

declare module "../../server/engine.js" {
  import type {
    Allocation,
    CarbonImpact,
    Dataset,
    ImpactReport,
    Service,
    ServiceImpact,
  } from "./types";
  export function clampFunding(service: Service, funding: number): number;
  export function fundingStatus(service: Service, funding: number): "boosted" | "steady" | "cut";
  export function projectOutcome(service: Service, funding: number): number;
  export function computeServiceImpact(service: Service, funding: number): ServiceImpact;
  export function totalAllocated(allocation: Allocation): number;
  export function equityScore(dataset: Dataset, allocation: Allocation): number;
  export function baselineEquityScore(dataset: Dataset): number;
  export function computeCarbonImpact(service: Service, funding: number): CarbonImpact;
  export function computeImpact(dataset: Dataset, allocation: Allocation): ImpactReport;
}
