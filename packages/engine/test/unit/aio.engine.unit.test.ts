import { describe, expect, it } from 'vitest';
import { AioSizingEngine } from '../../src/index.js';

const provenance = { sourceId: 'fixture:reviewed', sourceRecordId: 'case-1', sourceSha256: 'b'.repeat(64), transformationVersion: '1.0.0' };
const assumptionSources = ['inverterEfficiencyRatio', 'pvPerformanceRatio', 'autonomyDays', 'batteryChemistry', 'depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio', 'batteryNominalVoltageV'].map((assumptionId) => ({ assumptionId, provenance, declaredBy: 'Sol High' }));
const baseInput = () => ({
  schemaVersion: 1 as const,
  technicalContext: { applicationType: 'residential' as const, site: { arrayTiltDeg: 15, arrayAzimuthDeg: 180 } },
  load: { basis: 'direct-hourly-power' as const, intervalMinutes: 60 as const, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array.from({ length: 24 }, (_, hour) => hour === 8 ? 600 : 100), startupEvents: [{ hourIndex: 8, runningPowerW: 200, startupPowerMultiplier: 3, isInductive: true, sourceRef: 'pump' }] },
  solarDesignResource: { selectionMethod: 'declared-critical-month' as const, referencePeriod: { yearOrTypicalPeriod: 'TMY', month: 8 }, planeOfArrayIrradiationKWhPerM2PerDay: 5.5, arrayTiltDeg: 15, arrayAzimuthDeg: 180, source: { provider: 'review', datasetOrDocument: 'dataset', versionOrDate: '2026', locator: 'https://example.test', retrievedAtIso: '2026-08-13T00:00:00.000Z' }, qualityFlags: [], provenance },
  assumptions: { inverterEfficiencyRatio: 0.9, pvPerformanceRatio: 0.8, autonomyDays: 2, batteryChemistry: 'lead-acid' as const, depthOfDischargeRatio: 0.8, batteryDischargeEfficiencyRatio: 0.9, batteryNominalVoltageV: 48, assumptionSources },
  provenance: [provenance],
});

describe('AIO engine envelope', () => {
  it('returns deterministic evidence with all authorized outputs and traces', () => {
    const engine = new AioSizingEngine('1.0.0');
    const request = { system: 'standalone-all-in-one' as const, input: baseInput() };
    expect(engine.calculate(request)).not.toBeInstanceOf(Promise);
    const first = engine.calculateSync(request);
    const second = engine.calculateSync(request);
    expect(first.inputHash).toBe(second.inputHash);
    expect(first.engineVersion).toBe('1.0.0');
    expect(first.violatedConstraints).toEqual([]);
    expect(first.trace.map((item) => item.formulaId).sort()).toEqual(['CALC-AIO-001', 'CALC-AIO-001', 'CALC-AIO-002', 'CALC-AIO-003', 'CALC-AIO-004', 'CALC-AIO-005', 'CALC-AIO-006', 'CALC-AIO-006', 'CALC-AIO-007', 'CALC-AIO-007'].sort());
    expect(first.trace.find((item) => item.id === 'trace:dailyDcEnergyWh')?.substitutedValues).toEqual({ 'output.dailyAcEnergyWh': 2900, 'assumptions.inverterEfficiencyRatio': 0.9 });
    expect(first.output.minimumPvStcPowerW).toMatchObject({ status: 'available', unit: 'W' });
  });
  it('blocks only dependent outputs when an assumption or a start multiplier is missing', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.assumptions.inverterEfficiencyRatio = undefined;
    input.load.startupEvents = [{ hourIndex: 8, runningPowerW: 200, startupPowerMultiplier: null, isInductive: true, sourceRef: 'pump' }];
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.dailyAcEnergyWh.status).toBe('available');
    expect(result.output.minimumInverterContinuousAcPowerW.status).toBe('available');
    expect(result.output.dailyDcEnergyWh.status).toBe('blocked');
    expect(result.output.minimumInverterSurgeAcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_MISSING_STARTUP_MULTIPLIER'] });
  });
  it('blocks dependent calculations when a declared technical assumption lacks provenance', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.assumptions.assumptionSources = input.assumptions.assumptionSources.filter((source) => source.assumptionId !== 'pvPerformanceRatio');
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.dailyDcEnergyWh.status).toBe('available');
    expect(result.output.minimumPvStcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_MISSING_ASSUMPTION_SOURCE'] });
  });
  it('keeps independent outputs available when a single technical value is invalid', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.assumptions.pvPerformanceRatio = 0 as never;
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.dailyAcEnergyWh.status).toBe('available');
    expect(result.output.dailyDcEnergyWh.status).toBe('available');
    expect(result.output.minimumUsableStorageWh.status).toBe('available');
    expect(result.output.minimumPvStcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_MISSING_PV_PERFORMANCE_RATIO'] });
  });
  it('keeps useful storage available for non lead-acid chemistry but blocks nominal capacity', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.assumptions.batteryChemistry = 'other';
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.minimumUsableStorageWh.status).toBe('available');
    expect(result.output.minimumLeadAcidNominalStorageWh).toMatchObject({ status: 'blocked', constraintIds: ['AIO_UNSUPPORTED_BATTERY_CHEMISTRY'] });
  });
  it('blocks only solar-dependent outputs when POA orientation is absent or inconsistent', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.technicalContext.site.arrayAzimuthDeg = 170;
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.dailyDcEnergyWh.status).toBe('available');
    expect(result.output.designPeakSunHoursHPerDay).toMatchObject({ status: 'blocked', constraintIds: ['AIO_INVALID_SOLAR_RESOURCE'] });
    expect(result.output.minimumPvStcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_INVALID_SOLAR_RESOURCE'] });
  });
  it('keeps energy available but blocks peak and inverter outputs for an unsourced meter profile', () => {
    const engine = new AioSizingEngine();
    const input = baseInput();
    input.load.basis = 'meter-estimate';
    input.load.derivation = { method: 'monthly-energy-allocation' };
    const result = engine.calculateSync({ system: 'standalone-all-in-one', input });
    expect(result.output.dailyAcEnergyWh.status).toBe('available');
    expect(result.output.dailyDcEnergyWh.status).toBe('available');
    expect(result.output.peakCoincidentAcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_METER_PROFILE_UNSOURCED'] });
    expect(result.output.minimumInverterContinuousAcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_METER_PROFILE_UNSOURCED'] });
    expect(result.output.minimumInverterSurgeAcPowerW).toMatchObject({ status: 'blocked', constraintIds: ['AIO_METER_PROFILE_UNSOURCED'] });
  });
});
