import type { CalculationEnvelope, CalculationIssue } from '@ksd/domain';

export interface SizingModuleSnapshot {
  readonly id: string; readonly powerW: number; readonly vmpV: number; readonly vocV: number;
  readonly iscA: number; readonly vocTemperatureCoefficientPerC?: number | null;
}
export interface SizingBatterySnapshot {
  readonly id: string; readonly voltageV: number; readonly capacityAh: number; readonly energyWh: number;
  readonly usableDodRatio?: number | null;
}
export interface SizingInverterSnapshot {
  readonly id: string; readonly acPowerW: number; readonly dcVoltageV: number; readonly surgePowerW?: number | null;
  readonly mpptMinV?: number | null; readonly mpptMaxV?: number | null; readonly pvMaxPowerW?: number | null;
  readonly vocMaxV?: number | null; readonly maxChargingCurrentA?: number | null; readonly maxParallelUnits?: number | null;
  readonly canBeInParallel?: boolean | null;
}
export interface SizingInputV1 {
  readonly requiredPvPowerKw: number; readonly requiredStorageKwh: number; readonly requiredInverterPowerKw: number;
  readonly coldTemperatureC: number; readonly referenceTemperatureC: number; readonly temperatureCoefficientDefaultPerC: number;
  readonly selectedEquipment: { readonly module: SizingModuleSnapshot; readonly battery: SizingBatterySnapshot; readonly inverter: SizingInverterSnapshot };
  readonly estimatedCosts?: { readonly pvSpecificCostMinorPerKw: number | null; readonly storageSpecificCostMinorPerKwh: number | null; readonly inverterSpecificCostMinorPerKw: number | null };
}
export interface SizingProgress { readonly completed: number; readonly total: number; readonly phase: 'pv' | 'battery' | 'inverter'; }
export interface SizingOutputV1 {
  readonly selectedEquipment: { readonly moduleId: string; readonly batteryId: string; readonly inverterId: string };
  readonly pv: { readonly modulesInSeries: number; readonly stringsInParallel: number; readonly totalModules: number; readonly requiredPowerKwc: number; readonly obtainedPowerKwc: number; readonly marginRatio: number; readonly vmpOperatingV: number; readonly vocColdV: number; readonly iscA: number };
  readonly battery: { readonly unitsInSeries: number; readonly stringsInParallel: number; readonly totalUnits: number; readonly requiredEnergyKwh: number; readonly obtainedEnergyKwh: number; readonly usefulEnergyKwh: number; readonly marginRatio: number; readonly bankVoltageV: number };
  readonly inverter: { readonly count: number; readonly requiredPowerKw: number; readonly obtainedPowerKw: number; readonly marginRatio: number };
  readonly compatibility: { readonly compatible: boolean; readonly issues: readonly CalculationIssue[]; readonly warnings: readonly CalculationIssue[] };
  readonly valid: boolean;
  readonly estimate?: { readonly status: 'available'; readonly pvMinor: number; readonly storageMinor: number; readonly inverterMinor: number; readonly mainEquipmentMinor: number; readonly scope: 'pv-storage-inverter-only' } | { readonly status: 'unavailable'; readonly missing: readonly string[] };
  readonly evidence?: { readonly methodVersion: string; readonly inputHash: string; readonly trace: readonly string[] };
}
export type SizingEnvelopeV1 = CalculationEnvelope<SizingOutputV1>;
