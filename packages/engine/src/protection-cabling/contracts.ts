export type ProtectionSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';
export type CableMaterial = 'copper' | 'aluminium';
export type ProtectionType = 'Fusible gPV' | 'Fusible gG' | 'Disjoncteur DC' | 'Disjoncteur AC';

export interface ProtectionSizingInput {
  readonly segment: ProtectionSegment; readonly moduleIscA?: number; readonly moduleVocV?: number; readonly pvStrings?: number;
  readonly pvModulesInSeries?: number; readonly inverterPowerW: number; readonly dcVoltageV: number;
  readonly acVoltageV: number; readonly poles?: number; readonly selectedCaliberA?: number | null; readonly selectedType?: ProtectionType | null;
  readonly maximumCurrentA?: number | null;
}
export interface ProtectionSizingResult {
  readonly segment: ProtectionSegment; readonly kind: ProtectionType; readonly allowedTypes: readonly ProtectionType[]; readonly selectedType: ProtectionType | null;
  readonly requiredA: number; readonly minimumCurrentA: number; readonly maximumCurrentA: number | null; readonly serviceVoltageV: number; readonly quantity: number;
  readonly options: readonly number[]; readonly compatibleRatingsA: readonly number[]; readonly caliberA: number | null; readonly selectedRatingA: number | null; readonly exact: boolean; readonly overridden: boolean;
  readonly state: 'awaiting-type' | 'awaiting-rating' | 'valid' | 'estimated' | 'unavailable'; readonly methodVersion: 'core-v1';
}
export interface CableSizingInput { readonly segment: ProtectionSegment; readonly currentA: number; readonly voltageV: number; readonly lengthM: number; readonly material: CableMaterial; readonly installation: 'buried' | 'not_buried'; readonly phase: 'dc' | 'single_phase' | 'three_phase'; readonly maxDropPercent?: number; }
export interface CableSizingResult { readonly segment: ProtectionSegment; readonly state: 'blocked' | 'valid' | 'unavailable'; readonly currentA: number; readonly voltageV: number; readonly minimalSection: number; readonly normalizedSection: number; readonly dropPercent: number; readonly maxDropPercent: number; readonly thermalSection: number; readonly voltageDropSection: number; readonly governingConstraint: 'thermal' | 'voltage-drop'; readonly resistivity: number; readonly correctionFactor: number; readonly issues: readonly string[]; }
export interface ProtectionCablingOutput { readonly protections: readonly ProtectionSizingResult[]; readonly cables: readonly CableSizingResult[]; }
