import { describe, expect, it } from 'vitest';
import { aioSizingRequestV1Schema, normalizeDirectHourlyPowerToAioDailyLoad, normalizeEquipmentScheduleToAioDailyLoad, normalizeMeterEstimateToAioDailyLoad } from '../../src/index.js';

const provenance = { sourceId: 'fixture:test', sourceRecordId: 'record-1', sourceSha256: 'a'.repeat(64), transformationVersion: '1.0.0' };

function validRequest() {
  return {
    schemaVersion: 1,
    technicalContext: { applicationType: 'residential', site: { arrayTiltDeg: 15, arrayAzimuthDeg: 180 } },
    load: { basis: 'direct-hourly-power', intervalMinutes: 60, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array.from({ length: 24 }, () => 0), startupEvents: [] },
    solarDesignResource: { selectionMethod: 'declared-critical-month', referencePeriod: { yearOrTypicalPeriod: 'TMY', month: 8 }, planeOfArrayIrradiationKWhPerM2PerDay: 5, arrayTiltDeg: 15, arrayAzimuthDeg: 180, source: { provider: 'fixture', datasetOrDocument: 'dataset', versionOrDate: '2026-01', locator: 'https://example.test/dataset', retrievedAtIso: '2026-08-13T00:00:00.000Z' }, qualityFlags: [], provenance },
    assumptions: { batteryChemistry: 'lead-acid', assumptionSources: [{ assumptionId: 'batteryChemistry', provenance, declaredBy: 'test' }] }, provenance: [provenance],
  };
}

describe('AIO input contracts', () => {
  it('accepts a canonical 24-hour, explicitly sourced request', () => {
    expect(aioSizingRequestV1Schema.parse(validRequest()).load.hourlyEnergyWh).toHaveLength(24);
  });
  it('rejects an ambiguous time interval and unsourced solar resource', () => {
    const value = validRequest();
    value.load.intervalMinutes = 30 as never;
    expect(() => aioSizingRequestV1Schema.parse(value)).toThrow();
  });
  it('rejects inductive startup with no actual multiplier', () => {
    const value = validRequest();
    value.load.startupEvents = [{ hourIndex: 2, runningPowerW: 100, startupPowerMultiplier: 1, isInductive: true, sourceRef: 'pump' }];
    expect(() => aioSizingRequestV1Schema.parse(value)).toThrow();
  });
  it('rejects an ambiguous non-inductive startup multiplier', () => {
    const value = validRequest();
    value.load.startupEvents = [{ hourIndex: 2, runningPowerW: 100, startupPowerMultiplier: null, isInductive: false, sourceRef: 'fan' }];
    expect(() => aioSizingRequestV1Schema.parse(value)).toThrow();
  });
  it('composes DATA-001 equipment schedules and conserves their daily energy', () => {
    const load = normalizeEquipmentScheduleToAioDailyLoad({
      timezoneIana: 'Africa/Lome', startupEvents: [],
      items: [{ id: 'fan', label: 'Fan', quantity: 2, activePowerW: 50, powerFactor: null, hourlyOperatingFractions: Array.from({ length: 24 }, (_, hour) => hour < 4 ? 1 : 0) }],
    });
    expect(load.hourlyEnergyWh.slice(0, 4)).toEqual([100, 100, 100, 100]);
    expect(load.hourlyEnergyWh.reduce((total, value) => total + value, 0)).toBe(400);
  });
  it('converts direct hourly W at the explicit one-hour boundary and keeps a sourced meter profile', () => {
    expect(normalizeDirectHourlyPowerToAioDailyLoad({ timezoneIana: 'Africa/Lome', hourlyPowerW: Array.from({ length: 24 }, () => 120), startupEvents: [] }).hourlyEnergyWh[0]).toBe(120);
    const meter = normalizeMeterEstimateToAioDailyLoad({
      timezoneIana: 'Africa/Lome', observedEnergyWh: 3_000, observedDays: 2, startupEvents: [],
      profile: { id: 'reviewed-profile', displayName: 'Reviewed', hourlyEnergyFractions: Array.from({ length: 24 }, () => 1 / 24), provenance },
    });
    expect(meter.derivation).toEqual({ method: 'metered-period/2-days', sourceProfileId: 'reviewed-profile' });
    expect(meter.hourlyEnergyWh.reduce((total, value) => total + value, 0)).toBeCloseTo(1_500, 8);
  });
});
