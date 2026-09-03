import type { SizingBatterySnapshot, SizingInverterSnapshot, SizingModuleSnapshot, SizingOutputV1 } from './contracts.js';

export type SelectionScope =
  | { readonly mode: 'fixed'; readonly equipmentId: string }
  | { readonly mode: 'shortlist'; readonly equipmentIds: readonly string[] }
  | { readonly mode: 'free' };

export interface OptimizationRequest {
  readonly enabled: boolean;
  readonly module: SelectionScope;
  readonly battery: SelectionScope;
  readonly inverter: SelectionScope;
  readonly objective: 'closest' | 'lowest-main-equipment-cost' | 'fewest-components';
  readonly maxOversizeRatio?: { readonly pv?: number; readonly storage?: number; readonly inverter?: number };
  readonly topN?: number;
}

export interface OptimizationCosts {
  readonly pvSpecificCostMinorPerKw: number | null;
  readonly storageSpecificCostMinorPerKwh: number | null;
  readonly inverterSpecificCostMinorPerKw: number | null;
}

export interface OptimizationCandidate {
  readonly rank: number;
  readonly input: { readonly module: SizingModuleSnapshot; readonly battery: SizingBatterySnapshot; readonly inverter: SizingInverterSnapshot };
  readonly output: SizingOutputV1;
  readonly relativeOversize: { readonly pv: number; readonly storage: number; readonly inverter: number };
  readonly maxOversize: number;
  readonly sumOversize: number;
  readonly componentCount: number;
  readonly completeCostMinor: number | null;
  readonly stableKey: string;
  readonly justification: readonly string[];
  readonly status: 'proposed';
}

export type OptimizationResult =
  | { readonly status: 'complete'; readonly candidates: readonly OptimizationCandidate[]; readonly examined: number; readonly rejected: number }
  | { readonly status: 'blocked'; readonly code: 'OPTIMIZATION_DISABLED' | 'OPTIMIZATION_SCOPE_EMPTY' | 'OPTIMIZATION_COST_OBJECTIVE_UNAVAILABLE'; readonly message: string };
