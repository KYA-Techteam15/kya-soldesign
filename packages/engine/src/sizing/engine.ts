import type { CalculationIssue } from '@ksd/domain';
import type { SizingEnvelopeV1, SizingInputV1, SizingProgress, SizingOutputV1, SizingInverterSnapshot } from './contracts.js';
import { estimateMainEquipmentCost } from './economics.js';
import { hashInput, trace } from '../shared/trace.js';

export interface CompatibleInverterCandidate { readonly inverterId: string; readonly modulesInSeries: number; readonly stringsInParallel: number; readonly batteryUnitsInSeries: number; readonly batteryStringsInParallel: number; readonly inverterCount: number; readonly issues: readonly string[]; }

const MAX_MODULES_IN_SERIES = 20;
const MAX_STRINGS_IN_PARALLEL = 200;
/** Coefficient Voc typique du silicium cristallin, utilisé seulement sans fiche (IEC 61215). */
export const DEFAULT_VOC_TEMPERATURE_COEFFICIENT_PER_C = -0.003;

interface PvConfiguration { readonly ns: number; readonly np: number; readonly total: number; readonly vmp: number; readonly voc: number; readonly isc: number }

/**
 * Coefficient Voc effectif, toujours négatif : le Voc du silicium augmente quand la
 * cellule refroidit. Un coefficient catalogue positif est une erreur de signe de la
 * fiche ; il est corrigé et signalé plutôt que de faire baisser le Voc à froid.
 */
export function effectiveVocCoefficient(module: SizingInputV1['selectedEquipment']['module'], input: Pick<SizingInputV1, 'temperatureCoefficientDefaultPerC'>): { readonly coefficientPerC: number; readonly source: 'catalog' | 'catalog-sign-corrected' | 'default' } {
  const raw = module.vocTemperatureCoefficientPerC;
  if (raw === null || raw === undefined) return { coefficientPerC: -Math.abs(input.temperatureCoefficientDefaultPerC), source: 'default' };
  return { coefficientPerC: -Math.abs(raw), source: raw > 0 ? 'catalog-sign-corrected' : 'catalog' };
}

/** IEC 62548 : Voc maximal à la température de cellule la plus basse attendue. */
export function coldVocPerModule(module: SizingInputV1['selectedEquipment']['module'], input: Pick<SizingInputV1, 'temperatureCoefficientDefaultPerC' | 'coldTemperatureC' | 'referenceTemperatureC'>): number {
  const { coefficientPerC } = effectiveVocCoefficient(module, input);
  return module.vocV * (1 + coefficientPerC * (input.coldTemperatureC - input.referenceTemperatureC));
}

/**
 * Seule règle de choix du champ PV : le plus petit nombre de modules qui couvre le
 * besoin et tient les bornes de l'onduleur, puis le moins de chaînes, puis la tension
 * la plus proche du milieu de la plage MPPT. Le filtre catalogue et le calcul complet
 * l'appellent tous deux, pour annoncer la configuration réellement retenue.
 */
function preferredPvConfiguration(input: SizingInputV1, inverter: SizingInverterSnapshot, onStep?: (completed: number) => void): PvConfiguration | null {
  const module = input.selectedEquipment.module;
  const vocCold = coldVocPerModule(module, input);
  const midMppt = (vmp: number) => ((inverter.mpptMinV ?? vmp) + (inverter.mpptMaxV ?? vmp)) / 2;
  let best: PvConfiguration | null = null;
  let completed = 0;
  for (let ns = 1; ns <= MAX_MODULES_IN_SERIES; ns += 1) for (let np = 1; np <= MAX_STRINGS_IN_PARALLEL; np += 1) {
    completed += 1; onStep?.(completed);
    const power = ns * np * module.powerW;
    const vmp = ns * module.vmpV;
    const voc = ns * vocCold;
    if (input.requiredPvPowerKw > power / 1000) continue;
    if (inverter.mpptMinV != null && vmp < inverter.mpptMinV) continue;
    if (inverter.mpptMaxV != null && vmp > inverter.mpptMaxV) continue;
    if (inverter.vocMaxV != null && voc > inverter.vocMaxV) continue;
    if (inverter.pvMaxPowerW != null && power > inverter.pvMaxPowerW) continue;
    const candidate = { ns, np, total: ns * np, vmp, voc, isc: np * module.iscA };
    if (best === null || candidate.total < best.total || (candidate.total === best.total && (candidate.np < best.np || (candidate.np === best.np && Math.abs(candidate.vmp - midMppt(candidate.vmp)) < Math.abs(best.vmp - midMppt(best.vmp)))))) best = candidate;
  }
  return best;
}

function batteryArrangement(input: SizingInputV1, inverter: SizingInverterSnapshot) {
  const battery = input.selectedEquipment.battery;
  const dod = battery.usableDodRatio ?? 1;
  const series = Math.max(1, Math.ceil(inverter.dcVoltageV / battery.voltageV));
  const parallel = Math.max(1, Math.ceil((input.requiredStorageKwh * 1000 / Math.max(dod, 0.01)) / (series * battery.energyWh)));
  return { series, parallel, dod };
}

function inverterCount(input: SizingInputV1, inverter: SizingInverterSnapshot): number {
  return Math.max(1, Math.ceil(input.requiredInverterPowerKw / (inverter.acPowerW / 1000)));
}

/** Filtre catalogue : mêmes règles, et même configuration, que le calcul complet. */
export function compatibleInverters(input: SizingInputV1, inverters: readonly SizingInverterSnapshot[]): CompatibleInverterCandidate[] {
  return inverters.flatMap((inverter) => {
    const pv = preferredPvConfiguration(input, inverter);
    if (pv === null) return [];
    const { series, parallel } = batteryArrangement(input, inverter);
    const count = inverterCount(input, inverter);
    if (count > 1 && inverter.canBeInParallel === false) return [];
    if (inverter.maxParallelUnits != null && count > inverter.maxParallelUnits) return [];
    if (isInverterOversized(input.requiredInverterPowerKw, inverter.acPowerW, count)) return [];
    return [{ inverterId: inverter.id, modulesInSeries: pv.ns, stringsInParallel: pv.np, batteryUnitsInSeries: series, batteryStringsInParallel: parallel, inverterCount: count, issues: [] }];
  });
}

export class SizingEngine {
  public readonly version = 'sizing-1.1.0';
  public async calculate(input: SizingInputV1, onProgress?: (progress: SizingProgress) => void, yieldControl: () => Promise<void> = () => Promise.resolve()): Promise<SizingEnvelopeV1> {
    validate(input);
    const { module, battery, inverter } = input.selectedEquipment;
    const issues: CalculationIssue[] = [];
    const warnings: CalculationIssue[] = [];
    const totalPv = MAX_MODULES_IN_SERIES * MAX_STRINGS_IN_PARALLEL;
    // 4 000 combinaisons au plus : le balayage tient en une milliseconde, la
    // progression est donc publiée une fois, avant de rendre la main.
    const found = preferredPvConfiguration(input, inverter);
    onProgress?.({ completed: totalPv, total: totalPv, phase: 'pv' });
    await yieldControl();
    const vocSource = effectiveVocCoefficient(module, input).source;
    if (vocSource === 'catalog-sign-corrected') warnings.push(issue('VOC_COEFFICIENT_SIGN_CORRECTED', `Le coefficient Voc de ${module.id} est positif dans le catalogue ; il a été traité comme négatif.`, 'warning'));
    if (vocSource === 'default') warnings.push(issue('VOC_COEFFICIENT_DEFAULTED', `Le coefficient Voc de ${module.id} n’est pas renseigné ; −0,30 %/°C a été utilisé.`, 'warning'));
    if (found === null) issues.push(issue('PV_NO_VALID_CONFIGURATION', 'Aucune configuration PV ne respecte les contraintes de l’onduleur.'));
    if (inverter.maxChargingCurrentA === null || inverter.maxChargingCurrentA === undefined) warnings.push(issue('INVERTER_CHARGE_CURRENT_UNKNOWN', 'Le courant maximal de charge de l’onduleur n’est pas renseigné.', 'warning'));
    const pv = found ?? { ns: 0, np: 0, total: 0, vmp: 0, voc: 0, isc: 0 };
    const { series, parallel, dod } = batteryArrangement(input, inverter);
    if (battery.usableDodRatio === null || battery.usableDodRatio === undefined) warnings.push(issue('BATTERY_DOD_UNKNOWN', 'La profondeur de décharge utile de la batterie n’est pas renseignée.', 'warning'));
    const totalBattery = series * parallel;
    const obtainedNominal = totalBattery * battery.energyWh / 1000;
    const useful = obtainedNominal * dod;
    const count = inverterCount(input, inverter);
    if (count > 1 && inverter.canBeInParallel === false) issues.push(issue('INVERTER_PARALLEL_NOT_ALLOWED', 'La puissance requise impose plusieurs onduleurs, mais le parallèle est interdit.'));
    if (inverter.maxParallelUnits != null && count > inverter.maxParallelUnits) issues.push(issue('INVERTER_PARALLEL_LIMIT_EXCEEDED', 'Le nombre d’onduleurs requis dépasse la limite catalogue.'));
    if (isInverterOversized(input.requiredInverterPowerKw, inverter.acPowerW, count)) issues.push(issue('INVERTER_POWER_OVERSIZED', 'La puissance nominale cumulée des onduleurs dépasse deux fois la puissance requise.'));
    if (inverter.dcVoltageV > 0 && Math.abs(series * battery.voltageV - inverter.dcVoltageV) / inverter.dcVoltageV > 0.2) warnings.push(issue('BATTERY_VOLTAGE_MARGIN', 'La tension du parc batterie s’écarte de plus de 20 % de la tension DC nominale.', 'warning'));
    const obtainedPvKwc = pv.total * module.powerW / 1000;
    const estimate = input.estimatedCosts === undefined ? undefined : estimateMainEquipmentCost({ pvKwc: obtainedPvKwc, storageKwh: obtainedNominal, inverterKw: count * inverter.acPowerW / 1000, ...input.estimatedCosts });
    const inputHash = hashInput(input);
    const output: SizingOutputV1 = {
      selectedEquipment: { moduleId: module.id, batteryId: battery.id, inverterId: inverter.id },
      pv: { modulesInSeries: pv.ns, stringsInParallel: pv.np, totalModules: pv.total, requiredPowerKwc: input.requiredPvPowerKw, obtainedPowerKwc: obtainedPvKwc, marginRatio: pv.total === 0 ? 0 : obtainedPvKwc / input.requiredPvPowerKw - 1, vmpOperatingV: pv.vmp, vocColdV: pv.voc, iscA: pv.isc },
      battery: { unitsInSeries: series, stringsInParallel: parallel, totalUnits: totalBattery, requiredEnergyKwh: input.requiredStorageKwh, obtainedEnergyKwh: obtainedNominal, usefulEnergyKwh: useful, marginRatio: useful / input.requiredStorageKwh - 1, bankVoltageV: series * battery.voltageV },
      inverter: { count, requiredPowerKw: input.requiredInverterPowerKw, obtainedPowerKw: count * inverter.acPowerW / 1000, marginRatio: count * inverter.acPowerW / 1000 / input.requiredInverterPowerKw - 1 },
      compatibility: { compatible: issues.length === 0, issues, warnings },
      valid: issues.length === 0,
      ...(estimate === undefined ? {} : { estimate: estimate.status === 'available' ? estimate : { status: 'unavailable', missing: estimate.missing } }),
      evidence: { methodVersion: this.version, inputHash, trace: ['pv:minimal-series-parallel', 'pv:voc-cold-iec62548', 'storage:integer-series-parallel', 'inverter:integer-count'] },
    };
    return {
      engineVersion: this.version, inputHash, output, issues: [...issues, ...warnings],
      trace: [
        trace('pv.vocColdV', 'voc-cold:Voc_STC·(1+β·(T_froid−25))', 'IEC-62548:2016-7.2', ['selectedEquipment.module.vocV', 'selectedEquipment.module.vocTemperatureCoefficientPerC', 'coldTemperatureC']),
        trace('pv.totalModules', 'pv:min(ns·np) s.c. MPPT, Voc_max, P_max', 'sizing-1.1.0', ['requiredPvPowerKw', 'selectedEquipment.inverter']),
        trace('battery.totalUnits', 'storage:ceil(V_dc/V_bat)·ceil(S/(DoD·series·E_unit))', 'sizing-1.1.0', ['requiredStorageKwh', 'selectedEquipment.battery']),
        trace('inverter.count', 'inverter:ceil(P_req/P_unit)', 'sizing-1.1.0', ['requiredInverterPowerKw', 'selectedEquipment.inverter.acPowerW']),
      ],
    };
  }
}

function isInverterOversized(requiredPowerKw: number, unitPowerW: number, count: number): boolean { return count * unitPowerW / 1000 > requiredPowerKw * 2; }
function issue(code: string, message: string, severity: 'error' | 'warning' = 'error') { return { code, severity, message, sourceId: 'sizing-1.1.0' } as const; }
function validate(input: SizingInputV1): void {
  if (![input.requiredPvPowerKw, input.requiredStorageKwh, input.requiredInverterPowerKw].every((v) => Number.isFinite(v) && v > 0)) throw new Error('SIZING_REQUIREMENTS_INVALID');
  if (!Number.isFinite(input.coldTemperatureC)) throw new Error('COLD_TEMPERATURE_MISSING');
}
