export function calculateDailyDcEnergyWh(dailyAcEnergyWh: number, inverterEfficiencyRatio: number): number {
  requireNonNegative(dailyAcEnergyWh, 'dailyAcEnergyWh');
  requirePositiveRatio(inverterEfficiencyRatio, 'inverterEfficiencyRatio');
  return dailyAcEnergyWh / inverterEfficiencyRatio;
}

/** CALC-AIO-003. 1 kW/m² is the STC reference irradiance, so the numeric quotient is h/day. */
export function calculatePeakSunHoursHPerDay(planeOfArrayIrradiationKWhPerM2PerDay: number): number {
  if (!Number.isFinite(planeOfArrayIrradiationKWhPerM2PerDay) || planeOfArrayIrradiationKWhPerM2PerDay <= 0) {
    throw new RangeError('planeOfArrayIrradiationKWhPerM2PerDay must be positive');
  }
  return planeOfArrayIrradiationKWhPerM2PerDay;
}

export function calculateMinimumPvStcPowerW(dailyDcEnergyWh: number, peakSunHoursHPerDay: number, pvPerformanceRatio: number): number {
  requireNonNegative(dailyDcEnergyWh, 'dailyDcEnergyWh');
  if (!Number.isFinite(peakSunHoursHPerDay) || peakSunHoursHPerDay <= 0) throw new RangeError('peakSunHoursHPerDay must be positive');
  requirePositiveRatio(pvPerformanceRatio, 'pvPerformanceRatio');
  return dailyDcEnergyWh / (peakSunHoursHPerDay * pvPerformanceRatio);
}

function requireNonNegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`${label} must be finite and non-negative`);
}

function requirePositiveRatio(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0 || value > 1) throw new RangeError(`${label} must be in (0, 1]`);
}
