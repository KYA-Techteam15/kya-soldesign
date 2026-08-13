import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculateDailyDcEnergyWh, calculateLeadAcidNominalStorageWh, calculateMinimumPvStcPowerW, calculateMinimumUsableStorageWh, summarizeDailyLoad } from '../../src/index.js';

describe('AIO calculation properties', () => {
  it('conserves energy under permutation and stays non-negative', () => {
    fc.assert(fc.property(fc.array(fc.double({ min: 0, max: 10_000, noNaN: true }), { minLength: 24, maxLength: 24 }), (values) => {
      const summary = summarizeDailyLoad(values);
      const reversed = summarizeDailyLoad([...values].reverse());
      expect(summary.dailyAcEnergyWh).toBeCloseTo(reversed.dailyAcEnergyWh, 8);
      expect(summary.dailyAcEnergyWh).toBeGreaterThanOrEqual(0);
      expect(summary.peakCoincidentAcPowerW).toBeGreaterThanOrEqual(0);
    }));
  });
  it('is monotonic for energy/autonomy and inverse-monotonic for solar resource and PR', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100_000, noNaN: true }),
      fc.integer({ min: 0, max: 10 }),
      fc.double({ min: 0.1, max: 1, noNaN: true }),
      fc.double({ min: 0.1, max: 12, noNaN: true }),
      (energy, autonomy, ratio, psh) => {
        expect(calculateMinimumUsableStorageWh(energy, autonomy + 1)).toBeGreaterThanOrEqual(calculateMinimumUsableStorageWh(energy, autonomy));
        expect(calculateMinimumPvStcPowerW(energy, psh, ratio)).toBeLessThanOrEqual(calculateMinimumPvStcPowerW(energy, psh, Math.max(0.1, ratio / 2)));
      },
    ));
  });
  it('is inverse-monotonic for inverter efficiency and lead-acid depth of discharge', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 100_000, noNaN: true }),
      fc.double({ min: 0.1, max: 1, noNaN: true }),
      fc.double({ min: 0.1, max: 1, noNaN: true }),
      (energy, efficiency, dod) => {
        expect(calculateDailyDcEnergyWh(energy, Math.min(1, efficiency + 0.01))).toBeLessThanOrEqual(calculateDailyDcEnergyWh(energy, efficiency));
        expect(calculateLeadAcidNominalStorageWh(energy, Math.min(1, dod + 0.01), 1)).toBeLessThanOrEqual(calculateLeadAcidNominalStorageWh(energy, dod, 1));
      },
    ));
  });
});
