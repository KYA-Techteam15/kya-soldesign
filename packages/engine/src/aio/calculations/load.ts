export interface DailyLoadSummary {
  readonly dailyAcEnergyWh: number;
  readonly peakCoincidentAcPowerW: number;
}

/** CALC-AIO-001: sums a 24 × 1h energy series and derives its hourly-average peak. */
export function summarizeDailyLoad(hourlyEnergyWh: readonly number[]): DailyLoadSummary {
  if (hourlyEnergyWh.length !== 24 || hourlyEnergyWh.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('hourlyEnergyWh must contain 24 finite non-negative Wh values');
  }
  return {
    dailyAcEnergyWh: hourlyEnergyWh.reduce((total, value) => total + value, 0),
    peakCoincidentAcPowerW: Math.max(...hourlyEnergyWh),
  };
}
