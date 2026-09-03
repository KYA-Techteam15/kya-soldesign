import { describe, expect, it } from 'vitest';
import { optimizeSizing, type SizingBatterySnapshot, type SizingInverterSnapshot, type SizingModuleSnapshot } from '../../src/index.js';

const module: SizingModuleSnapshot = { id: 'm', powerW: 300, vmpV: 30, vocV: 38, iscA: 10, vocTemperatureCoefficientPerC: 0.003 };
const battery: SizingBatterySnapshot = { id: 'b', voltageV: 48, capacityAh: 100, energyWh: 4_800, usableDodRatio: 0.8 };
const inverter: SizingInverterSnapshot = { id: 'i', acPowerW: 2_000, dcVoltageV: 48, surgePowerW: 3_000, mpptMinV: 30, mpptMaxV: 150, pvMaxPowerW: 4_000, vocMaxV: 180, maxChargingCurrentA: 60, maxParallelUnits: 2, canBeInParallel: true };
const base = { requiredPvPowerKw: 1, requiredStorageKwh: 3, requiredInverterPowerKw: 1, coldTemperatureC: 0, referenceTemperatureC: 25, temperatureCoefficientDefaultPerC: 0.003 };

describe('optional sizing optimization', () => {
  it('does not inspect a catalogue while disabled', async () => {
    expect(await optimizeSizing({ base, request: { enabled: false, module: { mode: 'free' }, battery: { mode: 'free' }, inverter: { mode: 'free' }, objective: 'closest' }, modules: [module], batteries: [battery], inverters: [inverter] })).toMatchObject({ status: 'blocked', code: 'OPTIMIZATION_DISABLED' });
  });
  it('respects fixed and shortlist scopes and returns proposed candidates', async () => {
    const result = await optimizeSizing({ base, request: { enabled: true, module: { mode: 'free' }, battery: { mode: 'shortlist', equipmentIds: ['b'] }, inverter: { mode: 'fixed', equipmentId: 'i' }, objective: 'closest', topN: 3 }, modules: [module], batteries: [battery], inverters: [inverter] });
    expect(result).toMatchObject({ status: 'complete', examined: 1 });
    if (result.status === 'complete') expect(result.candidates[0]).toMatchObject({ status: 'proposed', input: { battery: { id: 'b' }, inverter: { id: 'i' } }, rank: 1 });
  });
});
