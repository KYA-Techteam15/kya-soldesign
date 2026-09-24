import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { simulateHourlyEnergyBalance, simulateRetainedSystem } from '../../src/index.js';

const poa = Array.from({ length: 8760 }, (_, hour) => { const h = hour % 24; return h >= 7 && h <= 17 ? 600 : 0; });
const base = { pvPeakKw: 2, usableStorageKwh: 4, inverterKw: 1.5, hourlyLoadKwh: Array.from({ length: 24 }, () => 0.12), hourlyPoaWm2: poa, performanceRatio: 0.8, inverterEfficiency: 0.95, batteryEfficiency: 0.9 };

describe('simulateHourlyEnergyBalance', () => {
  it('never serves more than the demand and keeps ratios in [0, 1]', () => {
    fc.assert(fc.property(fc.double({ min: 0, max: 10, noNaN: true }), fc.double({ min: 0, max: 20, noNaN: true }), fc.double({ min: 0.1, max: 5, noNaN: true }), (pv, storage, inverter) => {
      const result = simulateHourlyEnergyBalance({ ...base, pvPeakKw: pv, usableStorageKwh: storage, inverterKw: inverter });
      expect(result.servedEnergyKwh).toBeLessThanOrEqual(result.demandedEnergyKwh + 1e-9);
      for (const ratio of [result.lpsp, result.lolp, result.sri]) { expect(ratio).toBeGreaterThanOrEqual(0); expect(ratio).toBeLessThanOrEqual(1); }
    }), { numRuns: 30 });
  });

  it('caps direct plus battery delivery at the inverter power', () => {
    const heavy = simulateHourlyEnergyBalance({ ...base, pvPeakKw: 20, usableStorageKwh: 100, inverterKw: 0.5, hourlyLoadKwh: Array.from({ length: 24 }, () => 1) });
    expect(heavy.servedEnergyKwh).toBeLessThanOrEqual(0.5 * 8760 + 1e-6);
    expect(heavy.lossHours).toBe(8760);
  });

  it('applies the inverter efficiency to battery discharge', () => {
    const night = Array.from({ length: 24 }, (_, h) => (h < 6 ? 0.2 : 0));
    const ideal = simulateHourlyEnergyBalance({ ...base, hourlyLoadKwh: night, inverterEfficiency: 1, batteryEfficiency: 1, usableStorageKwh: 0.5 });
    const lossy = simulateHourlyEnergyBalance({ ...base, hourlyLoadKwh: night, inverterEfficiency: 0.5, batteryEfficiency: 1, usableStorageKwh: 0.5 });
    expect(lossy.servedEnergyKwh).toBeLessThan(ideal.servedEnergyKwh);
  });

  it('starts the measured year from the steady state, not from a full battery', () => {
    // Sans PV, une batterie supposée pleine au 1er janvier servirait la charge
    // pendant les premières heures ; le régime établi ne sert rien.
    const noPv = simulateHourlyEnergyBalance({ ...base, pvPeakKw: 0, usableStorageKwh: 50 });
    expect(noPv.servedEnergyKwh).toBe(0);
    expect(simulateHourlyEnergyBalance(base)).toEqual(simulateHourlyEnergyBalance(base));
  });

  it('is the simulation used for the retained system', () => {
    const retained = simulateRetainedSystem({ pvPeakKw: base.pvPeakKw, storageKwh: base.usableStorageKwh, inverterKw: base.inverterKw, hourlyLoadKwh: base.hourlyLoadKwh, hourlyPoaWm2: poa, systemPerformanceRatio: 0.8, inverterEfficiencyRatio: 0.95, batteryEfficiencyRatio: 0.9 });
    expect(retained.sri).toBe(simulateHourlyEnergyBalance(base).sri);
  });
});
