import type { StartupEventV1 } from '@ksd/domain';

export function calculateMinimumUsableStorageWh(dailyDcEnergyWh: number, autonomyDays: number): number {
  if (!Number.isFinite(dailyDcEnergyWh) || dailyDcEnergyWh < 0) throw new RangeError('dailyDcEnergyWh must be finite and non-negative');
  if (!Number.isInteger(autonomyDays) || autonomyDays < 0) throw new RangeError('autonomyDays must be a non-negative integer');
  return dailyDcEnergyWh * autonomyDays;
}

export function calculateLeadAcidNominalStorageWh(usableStorageWh: number, depthOfDischargeRatio: number, batteryDischargeEfficiencyRatio: number): number {
  if (!Number.isFinite(usableStorageWh) || usableStorageWh < 0) throw new RangeError('usableStorageWh must be finite and non-negative');
  requirePositiveRatio(depthOfDischargeRatio, 'depthOfDischargeRatio');
  requirePositiveRatio(batteryDischargeEfficiencyRatio, 'batteryDischargeEfficiencyRatio');
  return usableStorageWh / (depthOfDischargeRatio * batteryDischargeEfficiencyRatio);
}

export function calculateLeadAcidNominalCapacityAh(nominalStorageWh: number, batteryNominalVoltageV: number): number {
  if (!Number.isFinite(nominalStorageWh) || nominalStorageWh < 0) throw new RangeError('nominalStorageWh must be finite and non-negative');
  if (!Number.isFinite(batteryNominalVoltageV) || batteryNominalVoltageV <= 0) throw new RangeError('batteryNominalVoltageV must be positive');
  return nominalStorageWh / batteryNominalVoltageV;
}

export function calculateInverterSurgeAcPowerW(hourlyEnergyWh: readonly number[], startupEvents: readonly StartupEventV1[]): number {
  if (hourlyEnergyWh.length !== 24 || hourlyEnergyWh.some((value) => !Number.isFinite(value) || value < 0)) throw new RangeError('hourlyEnergyWh must contain 24 finite non-negative values');
  let peak = Math.max(...hourlyEnergyWh);
  for (const event of startupEvents) {
    if (event.isInductive && (event.startupPowerMultiplier === null || event.startupPowerMultiplier <= 1)) {
      throw new RangeError('inductive startup event has no valid multiplier');
    }
    const eventSurge = event.isInductive
      ? hourlyEnergyWh[event.hourIndex]! + event.runningPowerW * (event.startupPowerMultiplier! - 1)
      : hourlyEnergyWh[event.hourIndex]!;
    peak = Math.max(peak, eventSurge);
  }
  return peak;
}

function requirePositiveRatio(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > 1) throw new RangeError(`${label} must be in (0, 1]`);
}
