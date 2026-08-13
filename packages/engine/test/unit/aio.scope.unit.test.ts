import { describe, expect, it } from 'vitest';
import { AioSizingEngine } from '../../src/index.js';

describe('AIO scope boundary', () => {
  it('does not expose simulation, equipment, safety, finance or document outputs', () => {
    const engine = new AioSizingEngine();
    const ownKeys = Object.keys(engine.calculateSync({
      system: 'standalone-all-in-one',
      input: {
        schemaVersion: 1,
        technicalContext: { applicationType: 'other', site: {} },
        load: { basis: 'direct-hourly-power', intervalMinutes: 60, timezoneIana: 'Africa/Lome', hourlyEnergyWh: Array.from({ length: 24 }, () => 0), startupEvents: [] },
        assumptions: { batteryChemistry: 'unknown', assumptionSources: [] },
        provenance: [{ sourceId: 'fixture', sourceRecordId: 'scope', sourceSha256: 'd'.repeat(64), transformationVersion: '1.0.0' }],
      },
    }).output);
    expect(ownKeys).toEqual([
      'dailyAcEnergyWh', 'peakCoincidentAcPowerW', 'dailyDcEnergyWh', 'designPeakSunHoursHPerDay', 'minimumPvStcPowerW',
      'minimumUsableStorageWh', 'minimumLeadAcidNominalStorageWh', 'minimumLeadAcidNominalCapacityAh',
      'minimumInverterContinuousAcPowerW', 'minimumInverterSurgeAcPowerW',
    ]);
    expect(ownKeys.join(' ')).not.toMatch(/lpsp|lolp|sri|lcoe|svi|co2|module|cable|protection|document/i);
  });
});
