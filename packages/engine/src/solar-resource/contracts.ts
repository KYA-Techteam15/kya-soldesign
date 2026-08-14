import type { CalculationEnvelope, CalculationIssue, CalculationTraceEntry, Provenance } from '@ksd/domain';

export interface SolarPosition {
  readonly zenithDeg: number;
  readonly azimuthDeg: number;
}

export interface KlucherInput {
  readonly surfaceTiltDeg: number;
  readonly surfaceAzimuthDeg: number;
  readonly solarZenithDeg: number;
  readonly solarAzimuthDeg: number;
  readonly dniWm2: number;
  readonly ghiWm2: number;
  readonly dhiWm2: number;
  readonly albedo: number;
}

export interface PlaneOfArrayIrradiance {
  readonly directWm2: number;
  readonly skyDiffuseWm2: number;
  readonly groundDiffuseWm2: number;
  readonly globalWm2: number;
}

export type GammaResult =
  | { readonly status: 'available'; readonly value: number; readonly thresholdWm2: number }
  | { readonly status: 'unavailable'; readonly reasonCode: 'LOAD_PROFILE_MISSING' | 'LOAD_PROFILE_ZERO' };

export interface SolarResourceAnalysisOutputV1 {
  readonly hourlyPoaWm2: readonly number[];
  readonly monthlyAverageDailyPoaKWhM2Day: readonly number[];
  readonly meanHourlyPoaWm2: readonly number[];
  readonly monthlyMeanHourlyPoaWm2: readonly (readonly number[])[];
  readonly annualPoaKWhM2: number;
  readonly designMonth: number | null;
  readonly gamma: GammaResult;
  readonly albedo: number;
  readonly loadHourlyEnergyWh: readonly number[] | null;
  readonly loadHourlyPeakPowerW: readonly number[] | null;
}

export interface SolarFormulaTraceV1 extends CalculationTraceEntry {
  readonly sourceIds: readonly string[];
}

export interface SolarResourceAnalysisEnvelopeV1 extends CalculationEnvelope<SolarResourceAnalysisOutputV1> {
  readonly contractVersion: 1;
  readonly provenance: readonly Provenance[];
  readonly warnings: readonly CalculationIssue[];
  readonly trace: readonly SolarFormulaTraceV1[];
}
