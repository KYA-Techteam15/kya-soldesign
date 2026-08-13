import type {
  AioSizingRequestV1,
  CalculationEnvelope,
  CalculationIssue,
  CalculationTraceEntry,
  Provenance,
} from '@ksd/domain';
import type { CalculationEngine, CalculationRequest } from '../engine.js';

export type AioOutputId =
  | 'dailyAcEnergyWh' | 'peakCoincidentAcPowerW' | 'dailyDcEnergyWh'
  | 'designPeakSunHoursHPerDay' | 'minimumPvStcPowerW' | 'minimumUsableStorageWh'
  | 'minimumLeadAcidNominalStorageWh' | 'minimumLeadAcidNominalCapacityAh'
  | 'minimumInverterContinuousAcPowerW' | 'minimumInverterSurgeAcPowerW';

export type AioUnit = 'Wh' | 'W' | 'Ah' | 'h/day';

export type AioOutputValue =
  | { readonly status: 'available'; readonly value: number; readonly unit: AioUnit; readonly traceIds: readonly string[] }
  | { readonly status: 'blocked'; readonly constraintIds: readonly string[] };

export interface AioSizingOutputV1 {
  readonly dailyAcEnergyWh: AioOutputValue;
  readonly peakCoincidentAcPowerW: AioOutputValue;
  readonly dailyDcEnergyWh: AioOutputValue;
  readonly designPeakSunHoursHPerDay: AioOutputValue;
  readonly minimumPvStcPowerW: AioOutputValue;
  readonly minimumUsableStorageWh: AioOutputValue;
  readonly minimumLeadAcidNominalStorageWh: AioOutputValue;
  readonly minimumLeadAcidNominalCapacityAh: AioOutputValue;
  readonly minimumInverterContinuousAcPowerW: AioOutputValue;
  readonly minimumInverterSurgeAcPowerW: AioOutputValue;
}

export interface ConstraintViolationV1 extends CalculationIssue {
  readonly blocksOutputIds: readonly AioOutputId[];
}

export interface FormulaTraceV1 extends CalculationTraceEntry {
  readonly sourceIds: readonly string[];
  readonly substitutedValues: Readonly<Record<string, number | string>>;
}

export interface EngineWarningV1 {
  readonly code: string;
  readonly message: string;
}

export interface AioSizingEnvelopeV1 extends CalculationEnvelope<AioSizingOutputV1> {
  readonly contractVersion: 1;
  readonly provenance: readonly Provenance[];
  readonly warnings: readonly EngineWarningV1[];
  readonly violatedConstraints: readonly ConstraintViolationV1[];
  readonly trace: readonly FormulaTraceV1[];
}

export type AioCalculationRequestV1 = CalculationRequest<AioSizingRequestV1>;

export interface AioSizingEngineV1 extends CalculationEngine<AioSizingRequestV1, AioSizingOutputV1> {
  calculateSync(request: AioCalculationRequestV1): AioSizingEnvelopeV1;
}
