import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading } from '../../src/index.js';

describe('Page 1 load normalization properties', () => {
  it('keeps equipment energy linear in quantity and operating time', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 100 }),
      fc.integer({ min: 1, max: 24 }),
      fc.integer({ min: 1, max: 10_000 }),
      (quantity, activeHours, usefulPowerW) => {
        const schedule = Array.from({ length: 24 }, (_, hour) => hour < activeHours ? 1 : 0);
        const result = normalizeEquipmentRows({
          timezoneIana: 'Africa/Lome',
          rows: [{
            id: 'load', label: 'Charge', quantity, usefulPowerW,
            efficiencyRatio: 1,
            hourlyOperatingFractions: schedule, startupPowerMultiplier: null,
          }],
        });
        expect(result.status).toBe('ready');
        if (result.status !== 'ready') return;
        expect(result.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0))
          .toBeCloseTo(quantity * usefulPowerW * activeHours, 7);
      },
    ));
  });

  it('preserves direct hourly energy without redistribution', () => {
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0, max: 50_000, noNaN: true }), { minLength: 24, maxLength: 24 }),
      (hourlyPowerW) => {
        const result = normalizeDirectHourlyRows({
          timezoneIana: 'Africa/Lome',
          hourlyPowerW,
          hourlyPeakPowerW: hourlyPowerW,
        });
        expect(result.status).toBe('ready');
        if (result.status !== 'ready') return;
        expect(result.load.hourlyEnergyWh).toEqual(hourlyPowerW);
      },
    ));
  });

  it('conserves the exact daily meter energy for every valid observation period', () => {
    fc.assert(fc.property(
      fc.integer({ min: 1, max: 366 }),
      fc.double({ min: 0, max: 10_000_000, noNaN: true }),
      (observedDays, dailyEnergyWh) => {
        const fractions = Array.from({ length: 24 }, (_, hour) => (hour + 1) / 300);
        const result = normalizeMeterReading({
          timezoneIana: 'Africa/Lome',
          observedEnergyWh: dailyEnergyWh * observedDays,
          observedDays,
          profile: {
            id: 'sourced-profile', displayName: 'Sourced profile', hourlyEnergyFractions: fractions,
            provenance: { sourceId: 'test', sourceRecordId: 'property', sourceSha256: 'a'.repeat(64), transformationVersion: '1.0.0' },
          },
        });
        expect(result.status).toBe('ready');
        if (result.status !== 'ready') return;
        expect(result.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0)).toBeCloseTo(dailyEnergyWh, 6);
      },
    ));
  });
});
