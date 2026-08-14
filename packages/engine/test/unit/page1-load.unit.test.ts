import { describe, expect, it } from 'vitest';
import { defaultOperatingFractions, normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading, operatingFractionsForSelectedHours, reconcileOperatingFractions } from '../../src/load-profile/index.js';

const provenance = { sourceId: 'reviewed', sourceRecordId: 'profile', sourceSha256: 'a'.repeat(64), transformationVersion: '1.0.0' };

describe('Page 1 load normalization', () => {
  it('creates the validated business-hours defaults and preserves decimal energy exactly', () => {
    expect(defaultOperatingFractions(4)).toEqual(Array.from({ length: 24 }, (_, hour) => hour >= 8 && hour < 12 ? 1 : 0));
    const decimal = defaultOperatingFractions(2.5);
    expect(decimal.slice(8, 11)).toEqual([1, 1, 0.5]);
    expect(decimal.reduce((sum, value) => sum + value, 0)).toBe(2.5);
  });

  it('repositions a duration without allowing the selected positions to change its sum', () => {
    expect(operatingFractionsForSelectedHours(2.5, [18, 19, 20]).slice(18, 21)).toEqual([1, 1, 0.5]);
    expect(() => operatingFractionsForSelectedHours(2.5, [18, 19])).toThrow(/exactly 3/);
    const current = operatingFractionsForSelectedHours(2.5, [18, 19, 20]);
    expect(reconcileOperatingFractions(2.75, current).slice(18, 21)).toEqual([1, 1, 0.75]);
    expect(reconcileOperatingFractions(4, current).slice(8, 12)).toEqual([1, 1, 1, 1]);
  });

  it('normalizes equipment useful power, efficiency, simultaneity and schedules without losing energy', () => {
    const result = normalizeEquipmentRows({
      timezoneIana: 'Africa/Lome',
      rows: [{ id: 'pump', label: 'Pompe', quantity: 2, usefulPowerW: 500, efficiencyRatio: 0.8, simultaneityRatio: 0.5, hourlyOperatingFractions: Array.from({ length: 24 }, (_, hour) => hour >= 8 && hour < 12 ? 1 : 0), startupPowerMultiplier: 3 }],
    });
    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0)).toBe(2500);
    expect(result.load.startupEvents).toEqual([{ hourIndex: 8, runningPowerW: 625, startupPowerMultiplier: 3, isInductive: true, sourceRef: 'pump' }]);
  });

  it('treats a block crossing midnight as one start and a continuous load as one representative start', () => {
    const crossing = Array.from({ length: 24 }, (_, hour) => hour >= 22 || hour < 2 ? 1 : 0);
    const continuous = Array.from({ length: 24 }, () => 1);
    for (const [schedule, expectedHour] of [[crossing, 22], [continuous, 0]] as const) {
      const result = normalizeEquipmentRows({ timezoneIana: 'Africa/Lome', rows: [{ id: 'motor', label: 'Moteur', quantity: 1, usefulPowerW: 100, efficiencyRatio: 1, simultaneityRatio: 1, hourlyOperatingFractions: schedule, startupPowerMultiplier: 2 }] });
      expect(result.status).toBe('ready');
      if (result.status === 'ready') expect(result.load.startupEvents.map((event) => event.hourIndex)).toEqual([expectedHour]);
    }
  });

  it('blocks incomplete equipment ratios instead of inventing defaults', () => {
    const result = normalizeEquipmentRows({ timezoneIana: 'Africa/Lome', rows: [{ id: 'load', label: 'Charge', quantity: 1, usefulPowerW: 100, efficiencyRatio: null, simultaneityRatio: null, hourlyOperatingFractions: Array.from({ length: 24 }, () => 0), startupPowerMultiplier: null }] });
    expect(result).toMatchObject({ status: 'blocked', issues: [{ code: 'LOAD_EFFICIENCY_MISSING' }, { code: 'LOAD_SIMULTANEITY_MISSING' }] });
  });

  it('normalizes direct hourly powers and blocks an invalid peak', () => {
    const invalid = normalizeDirectHourlyRows({ timezoneIana: 'Africa/Lome', hourlyPowerW: Array.from({ length: 24 }, () => 100), hourlyPeakPowerW: Array.from({ length: 24 }, () => 90) });
    expect(invalid.status).toBe('blocked');
    const valid = normalizeDirectHourlyRows({ timezoneIana: 'Africa/Lome', hourlyPowerW: Array.from({ length: 24 }, () => 100), hourlyPeakPowerW: Array.from({ length: 24 }, () => 100) });
    expect(valid.status).toBe('ready');
    if (valid.status === 'ready') expect(valid.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0)).toBe(2400);
  });

  it('uses the exact observed days and a sourced profile for meter estimates', () => {
    const result = normalizeMeterReading({ timezoneIana: 'Africa/Lome', observedEnergyWh: 31_000, observedDays: 31, profile: { id: 'flat', displayName: 'Flat', hourlyEnergyFractions: Array.from({ length: 24 }, () => 1 / 24), provenance } });
    expect(result.status).toBe('ready');
    if (result.status === 'ready') expect(result.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1000, 10);
  });
});
