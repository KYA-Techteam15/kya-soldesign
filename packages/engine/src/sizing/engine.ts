import type { CalculationIssue } from '@ksd/domain';
import type { SizingEnvelopeV1, SizingInputV1, SizingProgress, SizingOutputV1, SizingInverterSnapshot } from './contracts.js';
import { estimateMainEquipmentCost } from './economics.js';

export interface CompatibleInverterCandidate { readonly inverterId: string; readonly modulesInSeries: number; readonly stringsInParallel: number; readonly batteryUnitsInSeries: number; readonly batteryStringsInParallel: number; readonly inverterCount: number; readonly issues: readonly string[]; }

/** Fast catalogue filter used before an inverter can be offered to the user. */
export function compatibleInverters(input: SizingInputV1, inverters: readonly SizingInverterSnapshot[]): CompatibleInverterCandidate[] {
  return inverters.flatMap((inverter) => {
    const pv = choosePv(input, inverter);
    if (pv === null) return [];
    const series = Math.max(1, Math.ceil(inverter.dcVoltageV / input.selectedEquipment.battery.voltageV));
    const parallel = Math.max(1, Math.ceil((input.requiredStorageKwh * 1000 / Math.max(input.selectedEquipment.battery.usableDodRatio ?? 1, 0.01)) / (series * input.selectedEquipment.battery.energyWh)));
    const count = Math.max(1, Math.ceil(input.requiredInverterPowerKw / (inverter.acPowerW / 1000)));
    const issues: string[] = [];
    if (count > 1 && inverter.canBeInParallel === false) issues.push('INVERTER_PARALLEL_NOT_ALLOWED');
    if (inverter.maxParallelUnits != null && count > inverter.maxParallelUnits) issues.push('INVERTER_PARALLEL_LIMIT_EXCEEDED');
    if (isInverterOversized(input.requiredInverterPowerKw, inverter.acPowerW, count)) issues.push('INVERTER_POWER_OVERSIZED');
    if (issues.length > 0) return [];
    return [{ inverterId: inverter.id, modulesInSeries: pv.ns, stringsInParallel: pv.np, batteryUnitsInSeries: series, batteryStringsInParallel: parallel, inverterCount: count, issues }];
  });
}

export class SizingEngine {
  public readonly version = 'sizing-1.0.0';
  public async calculate(input: SizingInputV1, onProgress?: (progress: SizingProgress) => void, yieldControl: () => Promise<void> = () => Promise.resolve()): Promise<SizingEnvelopeV1> {
    validate(input);
    const { module, battery, inverter } = input.selectedEquipment;
    const issues: CalculationIssue[] = [];
    const warnings: CalculationIssue[] = [];
    const candidates: Array<{ ns: number; np: number; total: number; vmp: number; voc: number; isc: number }> = [];
    const totalPv = 20 * 200;
    let completed = 0;
    for (let ns = 1; ns <= 20; ns += 1) for (let np = 1; np <= 200; np += 1) {
      const voc = ns * coldVoc(module, input);
      const vmp = ns * module.vmpV;
      const isc = np * module.iscA;
      if (input.requiredPvPowerKw <= ns * np * module.powerW / 1000
        && (inverter.mpptMinV === null || inverter.mpptMinV === undefined || vmp >= inverter.mpptMinV)
        && (inverter.mpptMaxV === null || inverter.mpptMaxV === undefined || vmp <= inverter.mpptMaxV)
        && (inverter.vocMaxV === null || inverter.vocMaxV === undefined || voc <= inverter.vocMaxV)
        && (inverter.pvMaxPowerW === null || inverter.pvMaxPowerW === undefined || ns * np * module.powerW <= inverter.pvMaxPowerW)) candidates.push({ ns, np, total: ns * np, vmp, voc, isc });
      completed += 1;
      if (completed % 100 === 0) { onProgress?.({ completed, total: totalPv, phase: 'pv' }); await yieldControl(); }
    }
    if (candidates.length === 0) issues.push(issue('PV_NO_VALID_CONFIGURATION', 'Aucune configuration PV ne respecte les contraintes de l’onduleur.'));
    if (inverter.maxChargingCurrentA === null || inverter.maxChargingCurrentA === undefined) warnings.push(issue('INVERTER_CHARGE_CURRENT_UNKNOWN', 'Le courant maximal de charge de l’onduleur n’est pas renseigné.', 'warning'));
    const pv = candidates.toSorted((a, b) => a.total - b.total || a.np - b.np || Math.abs(a.vmp - ((inverter.mpptMinV ?? a.vmp) + (inverter.mpptMaxV ?? a.vmp)) / 2) - Math.abs(b.vmp - ((inverter.mpptMinV ?? b.vmp) + (inverter.mpptMaxV ?? b.vmp)) / 2))[0] ?? { ns: 0, np: 0, total: 0, vmp: 0, voc: 0, isc: 0 };
    const dod = battery.usableDodRatio ?? 1;
    if (battery.usableDodRatio === null || battery.usableDodRatio === undefined) warnings.push(issue('BATTERY_DOD_UNKNOWN', 'La profondeur de décharge utile de la batterie n’est pas renseignée.', 'warning'));
    const series = Math.max(1, Math.ceil(inverter.dcVoltageV / battery.voltageV));
    const parallel = Math.max(1, Math.ceil((input.requiredStorageKwh * 1000 / Math.max(dod, 0.01)) / (series * battery.energyWh)));
    const totalBattery = series * parallel;
    const obtainedNominal = totalBattery * battery.energyWh / 1000;
    const useful = obtainedNominal * dod;
    const count = Math.max(1, Math.ceil(input.requiredInverterPowerKw / (inverter.acPowerW / 1000)));
    if (count > 1 && inverter.canBeInParallel === false) issues.push(issue('INVERTER_PARALLEL_NOT_ALLOWED', 'La puissance requise impose plusieurs onduleurs, mais le parallèle est interdit.'));
    if (inverter.maxParallelUnits !== null && inverter.maxParallelUnits !== undefined && count > inverter.maxParallelUnits) issues.push(issue('INVERTER_PARALLEL_LIMIT_EXCEEDED', 'Le nombre d’onduleurs requis dépasse la limite catalogue.'));
    if (isInverterOversized(input.requiredInverterPowerKw, inverter.acPowerW, count)) issues.push(issue('INVERTER_POWER_OVERSIZED', 'La puissance nominale cumulée des onduleurs dépasse deux fois la puissance requise.'));
    if (inverter.dcVoltageV > 0 && Math.abs(series * battery.voltageV - inverter.dcVoltageV) / inverter.dcVoltageV > 0.2) warnings.push(issue('BATTERY_VOLTAGE_MARGIN', 'La tension du parc batterie s’écarte de plus de 20 % de la tension DC nominale.', 'warning'));
    const estimate = input.estimatedCosts === undefined ? undefined : estimateMainEquipmentCost({ pvKwc: pv.total * module.powerW / 1000, storageKwh: obtainedNominal, inverterKw: count * inverter.acPowerW / 1000, ...input.estimatedCosts });
    const output: SizingOutputV1 = { selectedEquipment: { moduleId: module.id, batteryId: battery.id, inverterId: inverter.id }, pv: { modulesInSeries: pv.ns, stringsInParallel: pv.np, totalModules: pv.total, requiredPowerKwc: input.requiredPvPowerKw, obtainedPowerKwc: pv.total * module.powerW / 1000, marginRatio: pv.total === 0 ? 0 : pv.total * module.powerW / 1000 / input.requiredPvPowerKw - 1, vmpOperatingV: pv.vmp, vocColdV: pv.voc, iscA: pv.isc }, battery: { unitsInSeries: series, stringsInParallel: parallel, totalUnits: totalBattery, requiredEnergyKwh: input.requiredStorageKwh, obtainedEnergyKwh: obtainedNominal, usefulEnergyKwh: useful, marginRatio: useful / input.requiredStorageKwh - 1, bankVoltageV: series * battery.voltageV }, inverter: { count, requiredPowerKw: input.requiredInverterPowerKw, obtainedPowerKw: count * inverter.acPowerW / 1000, marginRatio: count * inverter.acPowerW / 1000 / input.requiredInverterPowerKw - 1 }, compatibility: { compatible: issues.length === 0, issues, warnings }, valid: issues.length === 0, ...(estimate === undefined ? {} : { estimate: estimate.status === 'available' ? estimate : { status: 'unavailable', missing: estimate.missing } }), evidence: { methodVersion: this.version, inputHash: hash(JSON.stringify(input)), trace: ['pv:integer-series-parallel', 'storage:integer-series-parallel', 'inverter:integer-count'] } };
    return { engineVersion: this.version, inputHash: hash(JSON.stringify(input)), output, issues: [...issues, ...warnings], trace: [] };
  }
}
function choosePv(input: SizingInputV1, inverter: SizingInverterSnapshot) {
  const module = input.selectedEquipment.module;
  for (let ns = 1; ns <= 20; ns += 1) for (let np = 1; np <= 200; np += 1) {
    const vmp = ns * module.vmpV;
    const voc = ns * coldVoc(module, input);
    const power = ns * np * module.powerW;
    if (input.requiredPvPowerKw <= power / 1000 && (inverter.mpptMinV == null || vmp >= inverter.mpptMinV) && (inverter.mpptMaxV == null || vmp <= inverter.mpptMaxV) && (inverter.vocMaxV == null || voc <= inverter.vocMaxV) && (inverter.pvMaxPowerW == null || power <= inverter.pvMaxPowerW)) return { ns, np };
  }
  return null;
}
function coldVoc(module: SizingInputV1['selectedEquipment']['module'], input: SizingInputV1): number { const coefficient = module.vocTemperatureCoefficientPerC ?? input.temperatureCoefficientDefaultPerC; return module.vocV * (1 + coefficient * (input.referenceTemperatureC - input.coldTemperatureC)); }
function isInverterOversized(requiredPowerKw: number, unitPowerW: number, count: number): boolean { return count * unitPowerW / 1000 > requiredPowerKw * 2; }
function issue(code: string, message: string, severity: 'error' | 'warning' = 'error') { return { code, severity, message, sourceId: 'sizing-1.0.0' } as const; }
function validate(input: SizingInputV1): void { if (![input.requiredPvPowerKw, input.requiredStorageKwh, input.requiredInverterPowerKw].every((v) => Number.isFinite(v) && v > 0)) throw new Error('SIZING_REQUIREMENTS_INVALID'); }
function hash(value: string): string { let result = 2166136261; for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619); return (result >>> 0).toString(16).padStart(8, '0'); }
