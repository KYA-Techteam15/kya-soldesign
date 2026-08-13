import { describe, expect, it } from 'vitest';
import {
  calculateDailyDcEnergyWh,
  calculateInverterSurgeAcPowerW,
  calculateLeadAcidNominalCapacityAh,
  calculateLeadAcidNominalStorageWh,
  calculateMinimumPvStcPowerW,
  calculateMinimumUsableStorageWh,
  calculatePeakSunHoursHPerDay,
  summarizeDailyLoad,
} from '../../src/index.js';

describe('AIO calculation register', () => {
  it('CALC-AIO-001 aggregates energy and a coincident hourly-average peak', () => {
    const values = Array.from({ length: 24 }, (_, hour) => hour === 8 ? 600 : 100);
    expect(summarizeDailyLoad(values)).toEqual({ dailyAcEnergyWh: 2_900, peakCoincidentAcPowerW: 600 });
  });
  it('CALC-AIO-002/003/004 derives DC energy, PSH and PV STC power', () => {
    expect(calculateDailyDcEnergyWh(2_900, 0.9)).toBeCloseTo(3222.222222, 6);
    expect(calculatePeakSunHoursHPerDay(5.5)).toBe(5.5);
    expect(calculateMinimumPvStcPowerW(3_222.222222222, 5.5, 0.8)).toBeCloseTo(732.323232, 6);
  });
  it('CALC-AIO-005/006 derives usable and nominal lead-acid storage', () => {
    expect(calculateMinimumUsableStorageWh(3_000, 2)).toBe(6_000);
    expect(calculateLeadAcidNominalStorageWh(6_000, 0.8, 0.9)).toBeCloseTo(8333.333333, 6);
    expect(calculateLeadAcidNominalCapacityAh(8_333.333333333, 48)).toBeCloseTo(173.611111, 6);
  });
  it('CALC-AIO-007 includes the startup increment without double counting running load', () => {
    const hourly = Array.from({ length: 24 }, (_, hour) => hour === 8 ? 600 : 100);
    expect(calculateInverterSurgeAcPowerW(hourly, [{ hourIndex: 8, runningPowerW: 200, startupPowerMultiplier: 3, isInductive: true, sourceRef: 'pump' }])).toBe(1_000);
  });
  it('rejects invalid ratios, periods and energy series', () => {
    expect(() => summarizeDailyLoad([])).toThrow();
    expect(() => calculateDailyDcEnergyWh(1, 0)).toThrow();
    expect(() => calculatePeakSunHoursHPerDay(0)).toThrow();
    expect(() => calculateMinimumPvStcPowerW(1, 0, 0.8)).toThrow();
    expect(() => calculateMinimumUsableStorageWh(1, -1)).toThrow();
    expect(() => calculateLeadAcidNominalStorageWh(1, 0, 0.9)).toThrow();
  });
});
