import { describe, expect, it } from 'vitest';
import { coldVocPerModule, compatibleInverters, effectiveVocCoefficient, SizingEngine, type SizingInputV1 } from '../../src/index.js';

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

describe('cold open-circuit voltage (IEC 62548)', () => {
  const real = { id: 'real', powerW: 400, vmpV: 40, vocV: 48, iscA: 10, vocTemperatureCoefficientPerC: -0.0028 };
  const base = { ...input, coldTemperatureC: 5, temperatureCoefficientDefaultPerC: -0.003 };

  it('raises Voc when the cell is colder than 25 °C with a negative catalogue coefficient', () => {
    expect(coldVocPerModule(real, base)).toBeCloseTo(48 * (1 + 0.0028 * 20), 9);
    expect(coldVocPerModule(real, base)).toBeGreaterThan(48);
  });

  it('treats a positive catalogue coefficient as a sign error and warns', async () => {
    const wrongSign = { ...real, vocTemperatureCoefficientPerC: 0.0028 };
    expect(coldVocPerModule(wrongSign, base)).toBeCloseTo(coldVocPerModule(real, base), 9);
    const result = await new SizingEngine().calculate({ ...base, selectedEquipment: { ...base.selectedEquipment, module: wrongSign } });
    expect(result.issues.map((item) => item.code)).toContain('VOC_COEFFICIENT_SIGN_CORRECTED');
  });

  it('rejects a string whose cold Voc exceeds the inverter maximum', async () => {
    // 10 × 48 V = 480 V à 25 °C passe sous 500 V ; à −10 °C le Voc de 10 modules atteint 527 V.
    const inverter = { ...base.selectedEquipment.inverter, vocMaxV: 500, mpptMinV: 350, mpptMaxV: 450 };
    const cold = { ...base, coldTemperatureC: -10, requiredPvPowerKw: 4, selectedEquipment: { ...base.selectedEquipment, module: real, inverter } };
    const result = await new SizingEngine().calculate(cold);
    expect(result.output.pv.vocColdV).toBeLessThanOrEqual(500);
    expect(result.output.pv.modulesInSeries).toBeLessThan(10);
  });

  it('announces in the catalogue filter the configuration the engine retains', async () => {
    const candidate = compatibleInverters(base, [base.selectedEquipment.inverter])[0]!;
    const result = await new SizingEngine().calculate(base);
    expect([candidate.modulesInSeries, candidate.stringsInParallel]).toEqual([result.output.pv.modulesInSeries, result.output.pv.stringsInParallel]);
  });

  it('uses the default coefficient, negative, when the catalogue has none, and says so', async () => {
    const unknown = { ...real, vocTemperatureCoefficientPerC: null };
    expect(effectiveVocCoefficient(unknown, base)).toEqual({ coefficientPerC: -0.003, source: 'default' });
    expect(coldVocPerModule(unknown, base)).toBeCloseTo(48 * (1 + 0.003 * 20), 9);
    const result = await new SizingEngine().calculate({ ...base, selectedEquipment: { ...base.selectedEquipment, module: unknown } });
    expect(result.issues.map((item) => item.code)).toContain('VOC_COEFFICIENT_DEFAULTED');
  });

  it('keeps out of the catalogue filter the inverters the engine would reject', () => {
    const reference = base.selectedEquipment.inverter;
    const tooLowVoc = { ...reference, id: 'low-voc', vocMaxV: 30 };
    const single = { ...reference, id: 'single', acPowerW: 1000, canBeInParallel: false };
    const capped = { ...reference, id: 'capped', acPowerW: 1000, maxParallelUnits: 2 };
    const ids = compatibleInverters({ ...base, requiredInverterPowerKw: 2.5 }, [reference, tooLowVoc, single, capped]).map((candidate) => candidate.inverterId);
    expect(ids).toContain(reference.id);
    expect(ids).not.toContain('low-voc');
    expect(ids).not.toContain('single');
    expect(ids).not.toContain('capped');
  });

  it('sizes a field for an inverter that publishes no MPPT window', async () => {
    const open = { ...base.selectedEquipment.inverter, mpptMinV: null, mpptMaxV: null };
    const result = await new SizingEngine().calculate({ ...base, selectedEquipment: { ...base.selectedEquipment, inverter: open } });
    expect(result.output.pv.totalModules).toBeGreaterThan(0);
  });
  it('publishes a non-empty trace', async () => {
    expect((await new SizingEngine().calculate(base)).trace.length).toBeGreaterThan(0);
  });
});
