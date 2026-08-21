import { describe, expect, it } from 'vitest';
import { compatibleInverters, SizingEngine, type SizingInputV1 } from '../../src/index.js';

const input: SizingInputV1 = {
  requiredPvPowerKw: 3.2, requiredStorageKwh: 5, requiredInverterPowerKw: 2.5,
  coldTemperatureC: 0, referenceTemperatureC: 25, temperatureCoefficientDefaultPerC: 0.003,
  selectedEquipment: {
    module: { id: 'module', powerW: 400, vmpV: 40, vocV: 48, iscA: 10, vocTemperatureCoefficientPerC: 0.003 },
    battery: { id: 'battery', voltageV: 12, capacityAh: 200, energyWh: 2400, usableDodRatio: 0.8 },
    inverter: { id: 'inverter', acPowerW: 3000, dcVoltageV: 48, surgePowerW: 6000, mpptMinV: 120, mpptMaxV: 450, pvMaxPowerW: 5000, vocMaxV: 500, maxParallelUnits: 4, canBeInParallel: true },
  },
};

describe('SizingEngine', () => {
  it('selects deterministic PV, battery and inverter quantities', async () => {
    const result = await new SizingEngine().calculate(input);
    expect(result.output.valid).toBe(true);
    expect(result.output.pv).toMatchObject({ modulesInSeries: 8, stringsInParallel: 1, totalModules: 8, obtainedPowerKwc: 3.2 });
    expect(result.output.battery).toMatchObject({ unitsInSeries: 4, stringsInParallel: 1, totalUnits: 4, bankVoltageV: 48 });
    expect(result.output.inverter).toMatchObject({ count: 1, obtainedPowerKw: 3 });
  });

  it('rejects a PV field outside the inverter constraints', async () => {
    const result = await new SizingEngine().calculate({ ...input, selectedEquipment: { ...input.selectedEquipment, inverter: { ...input.selectedEquipment.inverter, pvMaxPowerW: 1000 } } });
    expect(result.output.valid).toBe(false);
    expect(result.output.compatibility.issues.map((issue) => issue.code)).toContain('PV_NO_VALID_CONFIGURATION');
  });

  it('rejects forbidden inverter parallel operation', async () => {
    const result = await new SizingEngine().calculate({ ...input, requiredInverterPowerKw: 5, selectedEquipment: { ...input.selectedEquipment, inverter: { ...input.selectedEquipment.inverter, canBeInParallel: false } } });
    expect(result.output.valid).toBe(false);
    expect(result.output.compatibility.issues.map((issue) => issue.code)).toContain('INVERTER_PARALLEL_NOT_ALLOWED');
  });

  it('rejects an inverter whose cumulative nominal power exceeds twice the requirement', async () => {
    const oversizedInverter = { ...input.selectedEquipment.inverter, id: 'oversized', acPowerW: 5100 };
    const oversizedInput = { ...input, selectedEquipment: { ...input.selectedEquipment, inverter: oversizedInverter } };
    const result = await new SizingEngine().calculate(oversizedInput);

    expect(result.output.valid).toBe(false);
    expect(result.output.compatibility.issues.map((issue) => issue.code)).toContain('INVERTER_POWER_OVERSIZED');
    expect(compatibleInverters(oversizedInput, [oversizedInverter])).toEqual([]);
  });

  it('accepts the historical upper boundary of exactly twice the required power', async () => {
    const boundaryInverter = { ...input.selectedEquipment.inverter, id: 'boundary', acPowerW: 5000 };
    const boundaryInput = { ...input, selectedEquipment: { ...input.selectedEquipment, inverter: boundaryInverter } };
    const result = await new SizingEngine().calculate(boundaryInput);

    expect(result.output.compatibility.issues.map((issue) => issue.code)).not.toContain('INVERTER_POWER_OVERSIZED');
    expect(compatibleInverters(boundaryInput, [boundaryInverter])).toHaveLength(1);
  });
});
