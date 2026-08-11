import { describe, expect, it } from 'vitest';
import { validateEquipment } from '../../src/index.js';

const provenance = {
  sourceId: 'fixture:test',
  sourceRecordId: 'record-1',
  sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transformationVersion: '1.0.0',
};

describe('equipment validation', () => {
  it('makes an equal surge value visible as a warning', () => {
    const result = validateEquipment({
      id: 'inverter-1',
      kind: 'inverter',
      manufacturer: 'Test',
      model: 'Reference',
      nominalAcPowerW: 5_000,
      nominalDcVoltageV: 48,
      surgePowerW: 5_000,
      nominalAcVoltageV: 230,
      efficiencyRatio: 0.95,
      pvArrayMaxPowerW: null,
      mpptMinVoltageV: null,
      mpptMaxVoltageV: null,
      pvOpenCircuitMaxVoltageV: null,
      pvInputsNumber: null,
      maxChargingCurrentA: null,
      maxParallelUnits: 1,
      canBeInParallel: true,
      inverterType: 'hybrid',
      provenance,
    });
    expect(result.equipment).not.toBeNull();
    expect(result.issues.map((issue) => issue.code)).toContain('INVERTER_SURGE_EQUALS_NOMINAL');
  });

  it('rejects inverted MPPT ranges', () => {
    const result = validateEquipment({
      id: 'inverter-1',
      kind: 'inverter',
      manufacturer: 'Test',
      model: 'Invalid',
      nominalAcPowerW: 5_000,
      nominalDcVoltageV: 48,
      surgePowerW: null,
      nominalAcVoltageV: null,
      efficiencyRatio: null,
      pvArrayMaxPowerW: null,
      mpptMinVoltageV: 500,
      mpptMaxVoltageV: 300,
      pvOpenCircuitMaxVoltageV: null,
      pvInputsNumber: null,
      maxChargingCurrentA: null,
      maxParallelUnits: null,
      canBeInParallel: null,
      inverterType: null,
      provenance,
    });
    expect(result.issues.map((issue) => issue.code)).toContain('INVERTER_MPPT_RANGE_INVALID');
  });
});
