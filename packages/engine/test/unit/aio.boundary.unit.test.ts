import { describe, expect, it } from 'vitest';
import { AioSizingEngine, type AioOutputId, type AioSizingEnvelopeV1 } from '../../src/index.js';

const assumptionIds = ['inverterEfficiencyRatio', 'pvPerformanceRatio', 'autonomyDays', 'batteryChemistry', 'depthOfDischargeRatio', 'batteryDischargeEfficiencyRatio', 'batteryNominalVoltageV'];

function baseInput() {
  const provenance = { sourceId: 'fixture:reviewed', sourceRecordId: 'boundary-1', sourceSha256: 'c'.repeat(64), transformationVersion: '1.0.0' };
  return {
    schemaVersion: 1 as const,
    technicalContext: { applicationType: 'residential' as const, site: { latitudeDeg: 6.13, longitudeDeg: 1.22, arrayTiltDeg: 15, arrayAzimuthDeg: 180 } },
    load: { basis: 'direct-hourly-power' as const, intervalMinutes: 60 as const, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array.from({ length: 24 }, (_, hour) => hour === 8 ? 600 : 100), startupEvents: [{ hourIndex: 8, runningPowerW: 200, startupPowerMultiplier: 3, isInductive: true, sourceRef: 'pump' }] },
    solarDesignResource: { selectionMethod: 'declared-critical-month' as const, referencePeriod: { yearOrTypicalPeriod: 'TMY', month: 8 }, planeOfArrayIrradiationKWhPerM2PerDay: 5.5, arrayTiltDeg: 15, arrayAzimuthDeg: 180, source: { provider: 'review', datasetOrDocument: 'dataset', versionOrDate: '2026', locator: 'https://example.test', retrievedAtIso: '2026-08-13T00:00:00.000Z' }, qualityFlags: [], provenance },
    assumptions: { inverterEfficiencyRatio: 0.9, pvPerformanceRatio: 0.8, autonomyDays: 2, batteryChemistry: 'lead-acid' as const, depthOfDischargeRatio: 0.8, batteryDischargeEfficiencyRatio: 0.9, batteryNominalVoltageV: 48, assumptionSources: assumptionIds.map((assumptionId) => ({ assumptionId, provenance, declaredBy: 'Sol High' })) },
    provenance: [provenance],
  };
}

function calculate(input: ReturnType<typeof baseInput>): AioSizingEnvelopeV1 {
  return new AioSizingEngine().calculateSync({ system: 'standalone-all-in-one', input });
}

function blockedIds(result: AioSizingEnvelopeV1): AioOutputId[] {
  return (Object.entries(result.output) as [AioOutputId, AioSizingEnvelopeV1['output'][AioOutputId]][])
    .filter(([, value]) => value.status === 'blocked')
    .map(([outputId]) => outputId);
}

describe('AIO boundary dependency matrix', () => {
  it('reports an unused invalid latitude without blocking quantitative outputs', () => {
    const input = baseInput();
    input.technicalContext.site.latitudeDeg = 91;
    const result = calculate(input);
    expect(blockedIds(result)).toEqual([]);
    expect(result.violatedConstraints).toContainEqual(expect.objectContaining({ code: 'AIO_INVALID_TECHNICAL_CONTEXT', path: 'technicalContext.site.latitudeDeg', blocksOutputIds: [] }));
    expect(result.inputHash).toMatch(/^diagnostic-fnv1a64:/);
  });

  it('blocks surge only when a startup event is invalid', () => {
    const input = baseInput();
    input.load.startupEvents[0]!.hourIndex = 24;
    const result = calculate(input);
    expect(blockedIds(result)).toEqual(['minimumInverterSurgeAcPowerW']);
    expect(result.output.minimumInverterSurgeAcPowerW).toEqual({ status: 'blocked', constraintIds: ['AIO_INVALID_STARTUP_EVENT'] });
  });

  it('keeps PSH available when the hourly series is invalid', () => {
    const input = baseInput();
    input.load.hourlyEnergyWh = input.load.hourlyEnergyWh.slice(0, 23);
    const result = calculate(input);
    expect(result.output.designPeakSunHoursHPerDay).toMatchObject({ status: 'available', unit: 'h/day' });
    expect(blockedIds(result)).not.toContain('designPeakSunHoursHPerDay');
    expect(result.violatedConstraints).toContainEqual(expect.objectContaining({ code: 'AIO_INVALID_HOURLY_SERIES' }));
  });

  it.each([0, Number.NaN])('blocks only PSH and PV for an invalid solar resource (%s) without a duplicate missing-resource issue', (invalidIrradiation) => {
    const input = baseInput();
    input.solarDesignResource.planeOfArrayIrradiationKWhPerM2PerDay = invalidIrradiation;
    const result = calculate(input);
    expect(blockedIds(result)).toEqual(['designPeakSunHoursHPerDay', 'minimumPvStcPowerW']);
    expect(result.violatedConstraints.map((item) => item.code)).toEqual(['AIO_INVALID_SOLAR_RESOURCE']);
    expect(JSON.stringify(result)).not.toContain('NaN');
  });

  it('blocks every public output when request provenance is invalid', () => {
    const input = baseInput();
    input.provenance[0]!.sourceSha256 = 'invalid';
    const result = calculate(input);
    expect(blockedIds(result)).toHaveLength(10);
    expect(result.violatedConstraints).toContainEqual(expect.objectContaining({ code: 'AIO_INVALID_PROVENANCE', blocksOutputIds: expect.arrayContaining(Object.keys(result.output)) }));
  });

  it('uses request-shape rather than hourly-series for an unrecoverable object contract', () => {
    const input = { ...baseInput(), unexpected: true };
    const result = new AioSizingEngine().calculateSync({ system: 'standalone-all-in-one', input: input as never });
    expect(blockedIds(result)).toHaveLength(10);
    expect(result.violatedConstraints.map((item) => item.code)).toEqual(['AIO_INVALID_REQUEST_SHAPE']);
  });

  it('deduplicates provenance by the complete immutable identity tuple', () => {
    const input = baseInput();
    input.provenance.push({ ...input.provenance[0]!, sourceSha256: 'd'.repeat(64) });
    const result = calculate(input);
    expect(result.provenance).toHaveLength(2);
    expect(new Set(result.provenance.map((item) => `${item.sourceId}:${item.sourceRecordId}:${item.sourceSha256}:${item.transformationVersion}`)).size).toBe(2);
  });

  it('merges the blocked-output evidence when one constraint code and path affects several assumptions', () => {
    const input = baseInput();
    input.assumptions.assumptionSources = input.assumptions.assumptionSources.filter((source) => !['pvPerformanceRatio', 'batteryNominalVoltageV'].includes(source.assumptionId));
    const result = calculate(input);
    const missingSource = result.violatedConstraints.filter((item) => item.code === 'AIO_MISSING_ASSUMPTION_SOURCE');
    expect(missingSource).toHaveLength(1);
    expect(missingSource[0]!.blocksOutputIds).toEqual(['minimumPvStcPowerW', 'minimumLeadAcidNominalCapacityAh']);
  });

  it.each([
    ['inverterEfficiencyRatio', Number.NaN, ['dailyDcEnergyWh', 'minimumPvStcPowerW', 'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']],
    ['pvPerformanceRatio', Number.NaN, ['minimumPvStcPowerW']],
    ['autonomyDays', -1, ['minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']],
    ['depthOfDischargeRatio', 0, ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']],
    ['batteryDischargeEfficiencyRatio', Infinity, ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']],
    ['batteryNominalVoltageV', 0, ['minimumLeadAcidNominalCapacityAh']],
    ['batteryChemistry', 'lithium', ['minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh']],
  ] as const)('propagates an invalid %s only to its dependent outputs', (field, invalidValue, expectedBlocked) => {
    const input = baseInput();
    (input.assumptions as Record<string, unknown>)[field] = invalidValue;
    expect(blockedIds(calculate(input))).toEqual(expectedBlocked);
  });

  it('returns a deterministic, serializable diagnostic envelope with ordered deduplicated evidence', () => {
    const input = baseInput();
    input.assumptions.pvPerformanceRatio = Number.NaN;
    const first = calculate(input);
    const second = calculate(input);
    expect(first).toEqual(second);
    expect(() => JSON.stringify(first)).not.toThrow();
    expect(first.inputHash).toMatch(/^diagnostic-fnv1a64:/);
    expect(new Set(first.violatedConstraints.map((item) => `${item.code}:${item.path}`)).size).toBe(first.violatedConstraints.length);
    for (const value of Object.values(first.output)) {
      if (value.status === 'available') {
        expect(value.unit).toBeTruthy();
        expect(value.traceIds).toHaveLength(1);
        expect(first.trace.some((trace) => trace.id === value.traceIds[0] && trace.sourceIds.length > 0)).toBe(true);
      } else {
        expect(new Set(value.constraintIds).size).toBe(value.constraintIds.length);
      }
    }
    const other = baseInput();
    other.assumptions.pvPerformanceRatio = 0;
    expect(calculate(other).inputHash).not.toBe(first.inputHash);
  });
});
