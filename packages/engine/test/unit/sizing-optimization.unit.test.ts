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

  const free = { module: { mode: 'free' }, battery: { mode: 'free' }, inverter: { mode: 'free' } } as const;
  const bigModule: SizingModuleSnapshot = { ...module, id: 'm-big', powerW: 550, vmpV: 42, vocV: 50 };
  const bigBattery: SizingBatterySnapshot = { ...battery, id: 'b-big', capacityAh: 200, energyWh: 9_600 };

  it('blocks an empty scope instead of returning nothing', async () => {
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, inverter: { mode: 'fixed', equipmentId: 'absent' }, objective: 'closest' }, modules: [module], batteries: [battery], inverters: [inverter] });
    expect(result).toMatchObject({ status: 'blocked', code: 'OPTIMIZATION_SCOPE_EMPTY' });
  });

  it('refuses the cost objective while one specific cost is missing', async () => {
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'lowest-main-equipment-cost' }, modules: [module], batteries: [battery], inverters: [inverter], costs: { pvSpecificCostMinorPerKw: 400_000, storageSpecificCostMinorPerKwh: null, inverterSpecificCostMinorPerKw: 150_000 } });
    expect(result).toMatchObject({ status: 'blocked', code: 'OPTIMIZATION_COST_OBJECTIVE_UNAVAILABLE' });
  });

  it('ranks by main equipment cost when every specific cost is known', async () => {
    const costs = { pvSpecificCostMinorPerKw: 400_000, storageSpecificCostMinorPerKwh: 250_000, inverterSpecificCostMinorPerKw: 150_000 };
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'lowest-main-equipment-cost', topN: 4 }, modules: [module, bigModule], batteries: [battery, bigBattery], inverters: [inverter], costs });
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;
    const prices = result.candidates.map((candidate) => candidate.completeCostMinor);
    expect(prices.every((price) => price !== null && Number.isInteger(price))).toBe(true);
    expect(prices).toEqual(prices.toSorted((left, right) => left! - right!));
    expect(result.candidates.map((candidate) => candidate.rank)).toEqual(result.candidates.map((_, index) => index + 1));
  });

  it('prefers the fewest components when asked', async () => {
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'fewest-components', topN: 4 }, modules: [module, bigModule], batteries: [battery, bigBattery], inverters: [inverter] });
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;
    const counts = result.candidates.map((candidate) => candidate.componentCount);
    expect(counts).toEqual(counts.toSorted((left, right) => left - right));
    expect(result.candidates[0]!.completeCostMinor).toBeNull();
  });

  it('rejects candidates beyond the accepted oversize and counts them', async () => {
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'closest', maxOversizeRatio: { pv: 0, storage: 0, inverter: 0 } }, modules: [module], batteries: [battery], inverters: [inverter] });
    expect(result).toMatchObject({ status: 'complete', examined: 1, rejected: 1, candidates: [] });
  });

  it('rejects an invalid combination rather than proposing it', async () => {
    const lowVoltageInverter: SizingInverterSnapshot = { ...inverter, id: 'i-low', vocMaxV: 20, mpptMaxV: 20, mpptMinV: 10 };
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'closest' }, modules: [module], batteries: [battery], inverters: [lowVoltageInverter] });
    expect(result).toMatchObject({ status: 'complete', examined: 1, rejected: 1, candidates: [] });
  });

  it('reports progress and yields control every 50 candidates', async () => {
    const modules = Array.from({ length: 10 }, (_, index) => ({ ...module, id: `m${index}` }));
    const batteries = Array.from({ length: 11 }, (_, index) => ({ ...battery, id: `b${index}` }));
    let yields = 0; let last = { completed: 0, total: 0 };
    const result = await optimizeSizing({ base, request: { enabled: true, ...free, objective: 'closest', topN: 500 }, modules, batteries, inverters: [inverter], onProgress: (progress) => { last = progress; }, yieldControl: async () => { yields += 1; } });
    expect(last).toEqual({ completed: 110, total: 110 });
    expect(yields).toBe(2);
    if (result.status === 'complete') expect(result.examined).toBe(110);
  });
});
