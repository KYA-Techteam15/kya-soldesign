export type ProtectionSegment = 'pv_inverter' | 'inverter_battery' | 'inverter_load';
export type CableMaterial = 'copper' | 'aluminium';
export type ProtectionType = 'Fusible gPV' | 'Fusible gG' | 'Disjoncteur DC' | 'Disjoncteur AC';

export interface ProtectionSizingInput {
  readonly segment: ProtectionSegment; readonly moduleIscA?: number; readonly moduleVocV?: number; readonly pvStrings?: number;
  readonly pvModulesInSeries?: number;
  /** Tension de chaîne à froid (Voc froid × modules en série), si le dimensionnement la fournit. */
  readonly stringVocColdV?: number;
  readonly inverterPowerW: number;
  /** Tension nominale du parc batterie. */
  readonly dcVoltageV: number;
  readonly acVoltageV: number;
  /** Rendement onduleur ; sans valeur, 1 (côté prudent seulement pour la tension). */
  readonly inverterEfficiencyRatio?: number;
  readonly poles?: number; readonly selectedCaliberA?: number | null; readonly selectedType?: ProtectionType | null;
  readonly maximumCurrentA?: number | null;
}
export interface ProtectionSizingResult {
  readonly segment: ProtectionSegment; readonly kind: ProtectionType; readonly allowedTypes: readonly ProtectionType[];
  readonly recommendedType: ProtectionType; readonly selectedType: ProtectionType | null;
  readonly requiredA: number; readonly minimumCurrentA: number; readonly maximumCurrentA: number | null; readonly serviceVoltageV: number; readonly quantity: number;
  readonly options: readonly number[]; readonly compatibleRatingsA: readonly number[];
  /** Plus petit calibre normalisé qui couvre le courant : proposé, jamais appliqué d'office. */
  readonly recommendedRatingA: number | null;
  readonly caliberA: number | null; readonly selectedRatingA: number | null; readonly exact: boolean; readonly overridden: boolean;
  readonly state: 'awaiting-type' | 'awaiting-rating' | 'valid' | 'out-of-range' | 'unavailable'; readonly methodVersion: 'core-v2';
}
export interface CableSizingInput {
  readonly segment: ProtectionSegment; readonly currentA: number; readonly voltageV: number; readonly lengthM: number;
  readonly material: CableMaterial; readonly installation: 'buried' | 'not_buried'; readonly phase: 'dc' | 'single_phase' | 'three_phase';
  readonly maxDropPercent?: number;
  /** Température ambiante maximale (air) du site ; sans valeur, la référence du tableau est retenue et signalée. */
  readonly ambientTemperatureC?: number | null;
}
export interface CableSizingResult {
  readonly segment: ProtectionSegment; readonly state: 'blocked' | 'valid' | 'unavailable'; readonly currentA: number; readonly voltageV: number;
  readonly minimalSection: number; readonly normalizedSection: number; readonly dropPercent: number; readonly maxDropPercent: number;
  readonly thermalSection: number; readonly voltageDropSection: number; readonly governingConstraint: 'thermal' | 'voltage-drop';
  readonly resistivity: number; readonly correctionFactor: number;
  readonly installationMethod: 'C' | 'D1'; readonly designTemperatureC: number; readonly temperatureAssumed: boolean;
  /** Courant admissible corrigé de la section retenue, A. */
  readonly ampacityA: number;
  readonly issues: readonly string[];
}
export interface ProtectionCablingOutput { readonly protections: readonly ProtectionSizingResult[]; readonly cables: readonly CableSizingResult[]; }
