import { describe, expect, it } from 'vitest';
import { batterySchema, inverterSchema } from '../../src/index.js';

const provenance = {
  sourceId: 'fixture:test',
  sourceRecordId: 'record-1',
  sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transformationVersion: '1.0.0',
};

describe('catalog boundary validation', () => {
  it('keeps unknown battery cycle life explicit', () => {
    const value = batterySchema.parse({
      id: 'battery-1',
      kind: 'battery',
      manufacturer: 'Test',
      model: 'Reference',
      nominalVoltageV: 48,
      nominalCapacityAh: 100,
      nominalEnergyWh: 4_800,
      usableDepthOfDischargeRatio: 0.8,
      roundTripEfficiencyRatio: 0.9,
      cycleLife: null,
      technology: 'Lithium-ion',
      provenance,
    });
    expect(value.cycleLife).toBeNull();
  });

  it('rejects an inverter whose surge power is absent', () => {
    expect(() => inverterSchema.parse({
      id: 'inverter-1',
      kind: 'inverter',
      manufacturer: 'Test',
      model: 'Invalid',
      nominalAcPowerW: 5_000,
      nominalDcVoltageV: 48,
      provenance,
    })).toThrow();
  });
});

