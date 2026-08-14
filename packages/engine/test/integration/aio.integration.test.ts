import { describe, expect, it } from 'vitest';
import { aioSizingRequestV1Schema } from '@ksd/domain';
import { AioSizingEngine } from '../../src/index.js';

const provenance = { sourceId: 'fixture:integration', sourceRecordId: 'integration-case', sourceSha256: 'c'.repeat(64), transformationVersion: '1.0.0' };

describe('AIO integration', () => {
  it('validates canonical input, runs through the generic engine protocol and exposes no defaulted dependency', async () => {
    const input = aioSizingRequestV1Schema.parse({
      schemaVersion: 1,
      technicalContext: { applicationType: 'commercial', site: { localityId: 'lome', latitudeDeg: 6.17, longitudeDeg: 1.23, arrayTiltDeg: 10, arrayAzimuthDeg: 180 } },
      load: { basis: 'equipment-schedule', intervalMinutes: 60, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array.from({ length: 24 }, (_, hour) => hour < 8 ? 300 : 0), startupEvents: [] },
      solarDesignResource: { selectionMethod: 'declared-critical-month', referencePeriod: { yearOrTypicalPeriod: 'TMY', month: 7 }, planeOfArrayIrradiationKWhPerM2PerDay: 4.5, arrayTiltDeg: 10, arrayAzimuthDeg: 180, source: { provider: 'fixture', datasetOrDocument: 'POA dataset', versionOrDate: 'v1', locator: 'https://example.test/poa', retrievedAtIso: '2026-08-13T00:00:00.000Z' }, qualityFlags: ['fixture-only'], provenance },
      assumptions: { inverterEfficiencyRatio: 0.95, pvPerformanceRatio: 0.8, autonomyDays: 1, batteryChemistry: 'other', assumptionSources: ['inverterEfficiencyRatio', 'pvPerformanceRatio', 'autonomyDays'].map((assumptionId) => ({ assumptionId, provenance, declaredBy: 'integration test' })) },
      provenance: [provenance],
    });
    const engine = new AioSizingEngine();
    const envelope = await engine.calculate({ system: 'standalone-all-in-one', input });
    expect(envelope.output.dailyAcEnergyWh).toMatchObject({ status: 'available', value: 2_400, unit: 'Wh' });
    expect(envelope.output.minimumLeadAcidNominalCapacityAh).toMatchObject({ status: 'blocked', constraintIds: ['AIO_UNSUPPORTED_BATTERY_CHEMISTRY'] });
    expect(envelope.output.minimumPvStcPowerW.status).toBe('available');
  });
});
