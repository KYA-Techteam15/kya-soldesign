import type { CanonicalDailyLoadV1 } from '@ksd/domain';

export interface LoadInputIssue {
  readonly code: string;
  readonly path: string;
  readonly message: string;
}

export interface LoadWarning {
  readonly code: string;
  readonly message: string;
}

export type Page1LoadNormalization =
  | { readonly status: 'ready'; readonly load: CanonicalDailyLoadV1; readonly warnings: readonly LoadWarning[] }
  | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] };

export interface EquipmentScheduleRow {
  readonly id: string;
  readonly label: string;
  readonly quantity: number;
  readonly usefulPowerW: number;
  readonly efficiencyRatio: number | null;
  readonly simultaneityRatio: number | null;
  readonly hourlyOperatingFractions: readonly number[];
  readonly startupPowerMultiplier: number | null;
}
