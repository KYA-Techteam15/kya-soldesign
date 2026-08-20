import type { CalculationEnvelope } from '@ksd/domain';

export interface PresizingInputV1 {
  readonly dailyEnergyWh: number;
  readonly yEn: number;
  readonly hourlyLoadWh: readonly number[];
  readonly hourlyPoaWm2: readonly number[];
  readonly peakPowerW: number;
  readonly lpspMax: number;
  readonly lolpMax: number;
  readonly systemPr: number;
  readonly inverterEfficiency: number;
  readonly batteryEfficiency: number;
  readonly pvSpecificCostPerKw: number;
  readonly batterySpecificCostPerKwh: number;
  readonly inverterSpecificCostPerKw: number;
  readonly gridTariffPerKwh: number;
  readonly emissionFactorKgPerKwh: number;
}

export interface PresizingProgress { readonly completed: number; readonly total: number; readonly alphaA: number; readonly alphaN: number; }
export interface PresizingCandidateV1 {
  readonly alphaA: number; readonly alphaN: number; readonly pvPeakKw: number; readonly storageKwh: number;
  readonly inverterKw: number; readonly annualProductionKwh: number; readonly lpsp: number; readonly lolp: number;
  readonly sri: number; readonly lcoe: number; readonly svi: number; readonly co2AvoidedKg: number;
}
export interface PresizingOutputV1 { readonly evaluatedPairs: number; readonly totalPairs: number; readonly selected: PresizingCandidateV1; readonly sriMin: number; readonly reliable: boolean; readonly viable: boolean; }
export type PresizingEnvelopeV1 = CalculationEnvelope<PresizingOutputV1>;
