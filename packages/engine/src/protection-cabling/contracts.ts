export type ProtectionSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';
export type CableMaterial = 'copper' | 'aluminium';

export interface ProtectionSizingInput {
  readonly segment: ProtectionSegment; readonly moduleIscA?: number; readonly moduleVocV?: number; readonly pvStrings?: number;
  readonly pvModulesInSeries?: number; readonly inverterPowerW: number; readonly dcVoltageV: number;
  readonly acVoltageV: number; readonly poles?: number; readonly selectedCaliberA?: number | null;
}
export interface ProtectionSizingResult {
  readonly segment: ProtectionSegment; readonly kind: 'Fusible gPV' | 'Fusible gG' | 'Disjoncteur DC' | 'Disjoncteur AC';
  readonly requiredA: number; readonly serviceVoltageV: number; readonly quantity: number;
  readonly options: readonly number[]; readonly caliberA: number; readonly exact: boolean; readonly overridden: boolean;
}
export interface CableSizingInput { readonly segment: ProtectionSegment; readonly currentA: number; readonly voltageV: number; readonly lengthM: number; readonly material: CableMaterial; readonly installation: 'buried' | 'not_buried'; readonly phase: 'dc' | 'single_phase' | 'three_phase'; readonly maxDropPercent?: number; }
export interface CableSizingResult { readonly segment: ProtectionSegment; readonly currentA: number; readonly voltageV: number; readonly minimalSection: number; readonly normalizedSection: number; readonly dropPercent: number; readonly maxDropPercent: number; readonly thermalSection: number; readonly resistivity: number; readonly correctionFactor: number; }
export interface ProtectionCablingOutput { readonly protections: readonly ProtectionSizingResult[]; readonly cables: readonly CableSizingResult[]; }
