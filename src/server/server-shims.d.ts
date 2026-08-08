// Same as the parent server-shims for the src/server test folder.

declare module "../../server/index.js" {
  import type { Express } from "express";
  export function createApp(opts?: { writeKey?: string }): {
    app: Express;
    store: {
      getDataset(): any;
      list(): any[];
      get(id: string): any;
      create(input: { name: string; allocation: any }): any;
      remove(id: string): boolean;
      _reset(): void;
    };
  };
}

declare module "../../server/seed.js" {
  export const dataset: any;
  export function baselineAllocation(): Record<string, number>;
}
