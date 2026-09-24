import type { CableCurrentBasis, CableSizingInput, CableSizingResult, ProtectionSegment, ProtectionSizingInput, ProtectionSizingResult, ProtectionType } from './contracts.js';
import { ampacityA, IEC_SECTIONS_MM2, REFERENCE_TEMPERATURE_C, temperatureCorrectionFactor, type InstallationMethod } from './iec60364.js';

export const STANDARD_SECTIONS = IEC_SECTIONS_MM2;

/** Séries de calibres normalisées (research.md R3). */
const RATINGS: Record<ProtectionType, readonly number[]> = {
  // IEC 60269-6
  'Fusible gPV': [1, 2, 3, 4, 6, 8, 10, 12, 15, 16, 20, 25, 30, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400],
  // IEC 60269-2
  'Fusible gG': [2, 4, 6, 10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 315, 400, 500, 630],
  // IEC 60947-2 (DC)
  'Disjoncteur DC': [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630],
  // IEC 60898-1 jusqu'à 125 A, puis boîtiers moulés IEC 60947-2
  'Disjoncteur AC': [6, 10, 13, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 250, 320, 400, 500, 630],
};

const ALLOWED_TYPES: Record<ProtectionSegment, readonly ProtectionType[]> = {
  pv_inverter: ['Fusible gPV', 'Disjoncteur DC'],
  inverter_battery: ['Fusible gG', 'Disjoncteur DC'],
  inverter_load: ['Disjoncteur AC'],
};
const RECOMMENDED_TYPE: Record<ProtectionSegment, ProtectionType> = { pv_inverter: 'Fusible gPV', inverter_battery: 'Disjoncteur DC', inverter_load: 'Disjoncteur AC' };

/** Seuil de coupure / tension nominale : 1,75/2,0 V (plomb) = 2,8/3,2 V (LFP) = 0,875. */
export const BATTERY_CUTOFF_VOLTAGE_RATIO = 0.875;
/** Résistivité en service, Ω·mm²/m. */
const RESISTIVITY = { copper: 0.01851, aluminium: 0.0283 } as const;

const positive = (value: number | undefined | null): number => value !== undefined && value !== null && Number.isFinite(value) && value > 0 ? value : 0;

function requirement(input: ProtectionSizingInput): { readonly requiredA: number; readonly voltageV: number; readonly quantity: number } {
  if (input.segment === 'pv_inverter') {
    const series = input.pvModulesInSeries ?? 1;
    const voltageV = positive(input.stringVocColdV) || 1.2 * series * positive(input.moduleVocV);
    // IEC 62548 : une protection de chaîne dimensionnée à 1,5 × Isc STC.
    return { requiredA: 1.5 * positive(input.moduleIscA), voltageV, quantity: input.pvStrings ?? 1 };
  }
  if (input.segment === 'inverter_battery') {
    const nominal = positive(input.dcVoltageV);
    const efficiency = positive(input.inverterEfficiencyRatio) || 1;
    // Le courant est maximal au seuil bas de tension et avant les pertes de conversion.
    const requiredA = nominal === 0 ? 0 : 1.25 * positive(input.inverterPowerW) / (efficiency * nominal * BATTERY_CUTOFF_VOLTAGE_RATIO);
    return { requiredA, voltageV: nominal, quantity: input.poles ?? 1 };
  }
  const voltageV = positive(input.acVoltageV);
  return { requiredA: voltageV === 0 ? 0 : 1.25 * positive(input.inverterPowerW) / voltageV, voltageV, quantity: input.poles ?? 1 };
}

/**
 * Par défaut, le type recommandé et le plus petit calibre normalisé qui couvre le
 * courant sont retenus : sans choix de l'ingénieur, la protection suit la
 * suggestion, y compris quand le dimensionnement change. Un choix explicite
 * l'emporte ; s'il ne couvre plus le courant, il est signalé (`awaiting-rating`)
 * et jamais remplacé en silence. Aucun calibre hors série n'est proposé.
 */
export function sizeProtectionSegment(input: ProtectionSizingInput): ProtectionSizingResult {
  const { requiredA, voltageV, quantity } = requirement(input);
  const allowedTypes = ALLOWED_TYPES[input.segment];
  const recommendedType = RECOMMENDED_TYPE[input.segment];
  const selectedType = input.selectedType !== undefined && input.selectedType !== null && allowedTypes.includes(input.selectedType) ? input.selectedType : null;
  const sizeable = requiredA > 0;
  const kind = selectedType ?? recommendedType;
  const options = !sizeable ? [] : RATINGS[kind].filter((value) => value >= requiredA && (input.maximumCurrentA == null || value <= input.maximumCurrentA));
  const recommendedRatingA = options[0] ?? null;
  const chosen = input.selectedCaliberA ?? null;
  const chosenInvalid = chosen !== null && !options.includes(chosen);
  const caliberA = chosen === null ? recommendedRatingA : chosenInvalid ? null : chosen;
  const state: ProtectionSizingResult['state'] = !sizeable ? 'unavailable'
    : options.length === 0 ? 'out-of-range'
      : caliberA === null ? 'awaiting-rating'
        : 'valid';
  return {
    segment: input.segment, kind, allowedTypes, recommendedType, selectedType,
    requiredA, minimumCurrentA: requiredA, maximumCurrentA: input.maximumCurrentA ?? null, serviceVoltageV: voltageV, quantity,
    options, compatibleRatingsA: options, recommendedRatingA,
    caliberA, selectedRatingA: caliberA, exact: state === 'valid', overridden: chosen !== null && !chosenInvalid && chosen !== recommendedRatingA,
    followsSuggestion: selectedType === null && chosen === null,
    state, methodVersion: 'core-v2',
  };
}

/**
 * Courant qui dimensionne le câble d'un tronçon : le calibre retenu, sinon le
 * calibre normalisé suggéré, sinon le courant requis. Les deux derniers cas donnent
 * une section provisoire, affichée pour guider le choix mais jamais livrée.
 */
export function cableDesignCurrent(protection: Pick<ProtectionSizingResult, 'caliberA' | 'recommendedRatingA' | 'requiredA'>): { readonly currentA: number; readonly basis: CableCurrentBasis } {
  if (protection.caliberA !== null) return { currentA: protection.caliberA, basis: 'selected-rating' };
  if (protection.recommendedRatingA !== null) return { currentA: protection.recommendedRatingA, basis: 'suggested-rating' };
  return { currentA: protection.requiredA, basis: 'design-current' };
}

/**
 * Section de câble : la plus petite section normalisée dont le courant admissible
 * corrigé couvre le courant (IEC 60364-5-52) et qui tient la chute de tension.
 */
export function sizeCableSegment(input: CableSizingInput): CableSizingResult {
  const current = positive(input.currentA); const voltage = positive(input.voltageV); const length = positive(input.lengthM);
  const maxDrop = input.maxDropPercent ?? 3;
  const b = input.phase === 'three_phase' ? Math.sqrt(3) : 2;
  const resistivity = RESISTIVITY[input.material];
  const method: InstallationMethod = input.installation === 'buried' ? 'D1' : 'C';
  const assumed = method === 'D1' || input.ambientTemperatureC === undefined || input.ambientTemperatureC === null;
  const designTemperatureC = method === 'C' && !assumed ? input.ambientTemperatureC! : REFERENCE_TEMPERATURE_C[method];
  const factor = temperatureCorrectionFactor(method, designTemperatureC);
  const currentBasis = input.currentBasis ?? 'selected-rating';
  const base = { segment: input.segment, currentA: current, voltageV: voltage, maxDropPercent: maxDrop, resistivity, installationMethod: method, designTemperatureC, temperatureAssumed: assumed, currentBasis, provisional: currentBasis !== 'selected-rating' } as const;
  const issues: string[] = [];
  if (current <= 0) issues.push('CURRENT_MISSING');
  if (voltage <= 0) issues.push('VOLTAGE_MISSING');
  if (length <= 0) issues.push('LENGTH_INVALID');
  if (maxDrop <= 0) issues.push('MAX_VOLTAGE_DROP_INVALID');
  if (issues.length > 0) return { ...base, state: 'blocked', minimalSection: 0, normalizedSection: 0, dropPercent: 0, thermalSection: 0, voltageDropSection: 0, governingConstraint: 'thermal', correctionFactor: factor ?? 1, ampacityA: 0, issues };
  if (factor === null) return { ...base, state: 'unavailable', minimalSection: 0, normalizedSection: 0, dropPercent: 0, thermalSection: 0, voltageDropSection: 0, governingConstraint: 'thermal', correctionFactor: 1, ampacityA: 0, issues: ['TEMPERATURE_OUT_OF_TABLE'] };
  const admissible = (section: number) => (ampacityA(input.material, method, section) ?? 0) * factor;
  const thermalSection = IEC_SECTIONS_MM2.find((section) => admissible(section) >= current) ?? null;
  const voltageDropSection = resistivity * length * current * b / (voltage * (maxDrop / 100));
  const normalized = thermalSection === null ? null : IEC_SECTIONS_MM2.find((section) => section >= thermalSection && section >= voltageDropSection) ?? null;
  const governingConstraint = thermalSection !== null && voltageDropSection > thermalSection ? 'voltage-drop' : 'thermal';
  if (normalized === null) return { ...base, state: 'unavailable', minimalSection: Math.max(thermalSection ?? 0, voltageDropSection), normalizedSection: 0, dropPercent: 0, thermalSection: thermalSection ?? 0, voltageDropSection, governingConstraint, correctionFactor: factor, ampacityA: 0, issues: ['NO_STANDARD_SECTION'] };
  const drop = resistivity * length * current * b / (normalized * voltage) * 100;
  return { ...base, state: 'valid', minimalSection: Math.max(thermalSection!, voltageDropSection), normalizedSection: normalized, dropPercent: drop, thermalSection: thermalSection!, voltageDropSection, governingConstraint, correctionFactor: factor, ampacityA: admissible(normalized), issues: [] };
}
export type { ProtectionSegment } from './contracts.js';
