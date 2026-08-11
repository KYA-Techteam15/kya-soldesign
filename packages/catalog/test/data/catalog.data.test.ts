import { describe, expect, it } from 'vitest';
import { batterySchema, inverterSchema } from '../../src/index.js';

const provenance = {
  sourceId: 'fixture:test',
  importedAt: '2026-08-11T00:00:00.000Z',
  sourceRecordId: 'record-1',
};

describe('catalog boundary validation', () => {
  it('keeps unknown battery cycle life explicit', () => {
    const value = batterySchema.parse({
      id: 'battery-1',
      kind: 'battery',
      manufacturer: 'Test',
      model: 'Reference',
      nominalVoltageV: 48,
      nominalCapacityWh: 5_000,
      usableDepthOfDischarge: 0.8,
      cycleLife: null,
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
      dcVoltageV: 48,
      provenance,
    })).toThrow();
  });
});

