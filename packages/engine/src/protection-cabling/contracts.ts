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
  /** Plus petit calibre normalisé qui couvre le courant : retenu par défaut. */
  readonly recommendedRatingA: number | null;
  /** Calibre retenu : le choix de l'ingénieur, sinon le calibre suggéré. */
  readonly caliberA: number | null; readonly selectedRatingA: number | null; readonly exact: boolean; readonly overridden: boolean;
  /** Vrai quand ni le type ni le calibre n'ont été choisis : la protection suit la suggestion. */
  readonly followsSuggestion: boolean;
  /** `awaiting-rating` : le calibre choisi ne couvre plus le courant requis. */
  readonly state: 'awaiting-rating' | 'valid' | 'out-of-range' | 'unavailable'; readonly methodVersion: 'core-v2';
}
export interface CableSizingInput {
  readonly segment: ProtectionSegment; readonly currentA: number; readonly voltageV: number; readonly lengthM: number;
  readonly material: CableMaterial; readonly installation: 'buried' | 'not_buried'; readonly phase: 'dc' | 'single_phase' | 'three_phase';
  readonly maxDropPercent?: number;
  /** Température ambiante maximale (air) du site ; sans valeur, la référence du tableau est retenue et signalée. */
  readonly ambientTemperatureC?: number | null;
  /** Origine du courant de dimensionnement ; par défaut, le calibre retenu par l'ingénieur. */
  readonly currentBasis?: CableCurrentBasis;
}
/**
 * Courant qui dimensionne le câble (IEC 60364-4-43 : Iz ≥ In) :
 * - `selected-rating` : calibre choisi par l'ingénieur, résultat définitif ;
 * - `suggested-rating` : plus petit calibre normalisé qui couvre le besoin, résultat provisoire ;
 * - `design-current` : aucun calibre normalisé ne couvre le besoin, résultat provisoire sur le courant requis.
 */
export type CableCurrentBasis = 'selected-rating' | 'suggested-rating' | 'design-current';
export interface CableSizingResult {
  readonly segment: ProtectionSegment; readonly state: 'blocked' | 'valid' | 'unavailable'; readonly currentA: number; readonly voltageV: number;
  readonly minimalSection: number; readonly normalizedSection: number; readonly dropPercent: number; readonly maxDropPercent: number;
  readonly thermalSection: number; readonly voltageDropSection: number; readonly governingConstraint: 'thermal' | 'voltage-drop';
  readonly resistivity: number; readonly correctionFactor: number;
  readonly installationMethod: 'C' | 'D1'; readonly designTemperatureC: number; readonly temperatureAssumed: boolean;
  /** Courant admissible corrigé de la section retenue, A. */
  readonly ampacityA: number;
  readonly currentBasis: CableCurrentBasis;
  /** Vrai tant que la protection du tronçon n'a pas de calibre retenu : la section n'est pas à livrer. */
  readonly provisional: boolean;
  readonly issues: readonly string[];
}
export interface ProtectionCablingOutput { readonly protections: readonly ProtectionSizingResult[]; readonly cables: readonly CableSizingResult[]; }
