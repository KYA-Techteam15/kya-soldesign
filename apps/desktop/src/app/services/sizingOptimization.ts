import type { Equipment } from '@ksd/catalog';
import { DEFAULT_VOC_TEMPERATURE_COEFFICIENT_PER_C, optimizeSizing, type OptimizationRequest, type OptimizationResult, type SizingBatterySnapshot, type SizingInverterSnapshot, type SizingModuleSnapshot } from '@ksd/engine';
import type { ProjectViewModel } from '../models/projectView.js';

export interface OptimizationRequirements { readonly pvKw: number; readonly storageKwh: number; readonly inverterKw: number; }

export async function runSizingOptimization(input: { readonly project: ProjectViewModel; readonly requirements: OptimizationRequirements; readonly equipment: readonly Equipment[]; readonly request: OptimizationRequest; readonly coldTemperatureC: number; readonly onProgress?: (progress: { readonly completed: number; readonly total: number }) => void; readonly signal?: AbortSignal }): Promise<OptimizationResult> {
  const eligible = input.equipment.filter((item) => item.archivedAt == null && item.calculationEligibility?.state !== 'ineligible');
  const modules = eligible.filter((item): item is Extract<Equipment, { kind: 'pv-module' }> => item.kind === 'pv-module').map(moduleSnapshot);
  const batteries = eligible.filter((item): item is Extract<Equipment, { kind: 'battery' }> => item.kind === 'battery').map(batterySnapshot);
  const inverters = eligible.filter((item): item is Extract<Equipment, { kind: 'inverter' }> => item.kind === 'inverter').map(inverterSnapshot);
  const a = input.project.assumptions;
  return optimizeSizing({
    base: { requiredPvPowerKw: input.requirements.pvKw, requiredStorageKwh: input.requirements.storageKwh, requiredInverterPowerKw: input.requirements.inverterKw, coldTemperatureC: input.coldTemperatureC, referenceTemperatureC: 25, temperatureCoefficientDefaultPerC: DEFAULT_VOC_TEMPERATURE_COEFFICIENT_PER_C, estimatedCosts: { pvSpecificCostMinorPerKw: afterMargin(a.pvSpecificCost, a.pvMargin), storageSpecificCostMinorPerKwh: afterMargin(a.batterySpecificCost, a.batteryMargin), inverterSpecificCostMinorPerKw: afterMargin(a.inverterSpecificCost, a.inverterMargin) } },
    request: input.request, modules, batteries, inverters,
    costs: { pvSpecificCostMinorPerKw: afterMargin(a.pvSpecificCost, a.pvMargin), storageSpecificCostMinorPerKwh: afterMargin(a.batterySpecificCost, a.batteryMargin), inverterSpecificCostMinorPerKw: afterMargin(a.inverterSpecificCost, a.inverterMargin) },
    onProgress: input.onProgress,
    // Rendre la main toutes les 50 combinaisons : l'interface reste réactive, et « Annuler » agit.
    yieldControl: () => new Promise((resolve, reject) => setTimeout(() => input.signal?.aborted ? reject(new DOMException('Aborted', 'AbortError')) : resolve(), 0)),
  });
}

export function candidateSelection(result: Extract<OptimizationResult, { status: 'complete' }>['candidates'][number]) { return { moduleId: result.input.module.id, batteryId: result.input.battery.id, inverterId: result.input.inverter.id }; }
function afterMargin(cost: number, marginPercent: number): number | null { return Number.isFinite(cost) && cost >= 0 ? Math.round(cost * (1 + marginPercent / 100)) : null; }
function moduleSnapshot(item: Extract<Equipment, { kind: 'pv-module' }>): SizingModuleSnapshot { return { id: item.id, powerW: item.nominalPowerW, vmpV: item.voltageAtMaximumPowerV, vocV: item.openCircuitVoltageV, iscA: item.shortCircuitCurrentA, vocTemperatureCoefficientPerC: item.temperatureCoefficientVocPerC }; }
function batterySnapshot(item: Extract<Equipment, { kind: 'battery' }>): SizingBatterySnapshot { return { id: item.id, voltageV: item.nominalVoltageV, capacityAh: item.nominalCapacityAh, energyWh: item.nominalEnergyWh, usableDodRatio: item.usableDepthOfDischargeRatio }; }
function inverterSnapshot(item: Extract<Equipment, { kind: 'inverter' }>): SizingInverterSnapshot { return { id: item.id, acPowerW: item.nominalAcPowerW, dcVoltageV: item.nominalDcVoltageV, surgePowerW: item.surgePowerW, mpptMinV: item.mpptMinVoltageV, mpptMaxV: item.mpptMaxVoltageV, pvMaxPowerW: item.pvArrayMaxPowerW, vocMaxV: item.pvOpenCircuitMaxVoltageV, maxChargingCurrentA: item.maxChargingCurrentA, maxParallelUnits: item.maxParallelUnits, canBeInParallel: item.canBeInParallel }; }
