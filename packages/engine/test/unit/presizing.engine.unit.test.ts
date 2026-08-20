import { describe, expect, it } from 'vitest';
import { PresizingEngine, type PresizingInputV1 } from '../../src/index.js';

const hourlyPoaWm2 = Array.from({ length: 8_760 }, (_, hour) => {
  const localHour = hour % 24;
  return localHour >= 7 && localHour <= 17 ? 500 : 0;
});
const base: PresizingInputV1 = {
  dailyEnergyWh: 10_000, yEn: 0.5, hourlyLoadWh: Array(24).fill(10_000 / 24), hourlyPoaWm2, peakPowerW: 1_000,
  lpspMax: 0.05, lolpMax: 0.05, systemPr: 0.8, inverterEfficiency: 0.95, batteryEfficiency: 0.9,
  pvSpecificCostPerKw: 300_000, batterySpecificCostPerKwh: 150_000, inverterSpecificCostPerKw: 100_000,
  gridTariffPerKwh: 150, emissionFactorKgPerKwh: 0.45,
};

describe('PresizingEngine', () => {
  it('evaluates the full 11 by 11 KEG grid and reports deterministic progress', async () => {
    const progress: number[] = [];
    const result = await new PresizingEngine().calculate(base, (item) => progress.push(item.completed));
    expect(result.output.evaluatedPairs).toBe(121);
    expect(progress).toHaveLength(121);
    expect(progress.at(-1)).toBe(121);
    expect(result.output.selected.pvPeakKw).toBeGreaterThan(0);
    expect(result.output.selected.pvPeakKw).toBeLessThan(100);
  });

  it.each([[0, 11], [1, 11]])('reduces the grid at the YEn boundary %s', async (yEn, expected) => {
    const result = await new PresizingEngine().calculate({ ...base, yEn });
    expect(result.output.totalPairs).toBe(expected);
    expect(result.output.evaluatedPairs).toBe(expected);
  });

  it('hashes inputs independently from the selected output', async () => {
    const engine = new PresizingEngine();
    const first = await engine.calculate(base);
    const second = await engine.calculate(base);
    expect(first.inputHash).toBe(second.inputHash);
  });

  it('rejects incomplete and invalid engineering inputs', async () => {
    await expect(new PresizingEngine().calculate({ ...base, systemPr: 0 })).rejects.toThrow('ASSUMPTION_OUT_OF_RANGE');
    await expect(new PresizingEngine().calculate({ ...base, hourlyPoaWm2: hourlyPoaWm2.slice(1) })).rejects.toThrow('HOURLY_DATA_INCOMPLETE');
  });
});
