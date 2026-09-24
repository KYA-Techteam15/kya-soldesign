import { describe, expect, it } from 'vitest';
import { FinanceEngine } from '../../src/finance/engine.js';

describe('FinanceEngine', () => {
  it('prices the retained system and derives real reliability and discounted indicators', () => {
    const hourlyLoadKwh = Array.from({ length: 24 }, () => 0.1);
    const hourlyPoaWm2 = Array.from({ length: 8760 }, (_, hour) => {
      const localHour = hour % 24;
      return localHour >= 7 && localHour <= 17 ? 500 : 0;
    });
    const result = new FinanceEngine().calculate({
      lines: [
        { key: 'modules', label: 'Modules', quantity: 4, unitCost: 100_000, marginRatio: 0.2 },
        { key: 'batteries', label: 'Batteries', quantity: 2, unitCost: 200_000, marginRatio: 0.1 },
        { key: 'inverters', label: 'Onduleurs', quantity: 1, unitCost: 300_000, marginRatio: 0.15 },
      ],
      vatRatio: 0.18, discountRatio: 0.05, downPaymentRatio: 0.5,
      pvPeakKw: 2, storageKwh: 5, inverterKw: 2, hourlyLoadKwh, hourlyPoaWm2,
      systemPerformanceRatio: 0.8, inverterEfficiencyRatio: 0.95, batteryEfficiencyRatio: 0.9,
      projectLifetimeYears: 20, batteryLifetimeYears: 5, inverterLifetimeYears: 10,
      pvMaintenanceRatioPerYear: 0.01, batteryMaintenanceRatioPerYear: 0.02, inverterMaintenanceRatioPerYear: 0.01,
      discountRateRatio: 0.05, gridTariffPerKwh: 125, emissionFactorKgPerKwh: 0.4,
      selfConsumptionRatio: 1, dieselSpecificCostPerKw: 300_000,
    });
    expect(result.output.totalCost).toBe(1_100_000);
    expect(result.output.totalSaleHt).toBe(1_201_750);
    expect(result.output.totalTtc).toBe(1_418_065);
    expect(result.output.downPayment).toBe(Math.round(result.output.totalTtc / 2));
    expect(result.output.downPayment + result.output.balanceDue).toBe(result.output.totalTtc);
    for (const amount of [result.output.totalCost, result.output.totalSaleHt, result.output.vatAmount, result.output.totalTtc, result.output.lifecycle.annualMaintenanceCost]) expect(Number.isInteger(amount)).toBe(true);
    expect(result.trace.length).toBeGreaterThan(0);
    expect(result.output.lifecycle.co2AvoidedTrees).toBeCloseTo(result.output.lifecycle.co2AvoidedKg / (22 * 20));
    expect(result.output.simulation.sri).toBeGreaterThan(0.9);
    expect(result.output.lifecycle.lcoeActualized).toBeGreaterThan(0);
    expect(result.output.lifecycle.svi).toBeCloseTo(result.output.lifecycle.lcoeActualized / 125);
  });
});
