import type { FinanceEnvelopeV1, FinanceInputV1, FinanceOutputV1, RetainedSystemSimulationV1 } from './contracts.js';
import { isAcceptedLoadLength } from '../presizing/engine.js';
import { simulateHourlyEnergyBalance } from '../simulation/hourly-balance.js';
import { hashInput, trace } from '../shared/trace.js';

/**
 * CO₂ absorbé par un arbre adulte et par an, en kg — ordre de grandeur de
 * vulgarisation de l'Agence européenne pour l'environnement (research.md R5).
 */
export const CO2_ABSORBED_PER_TREE_KG_PER_YEAR = 22;

/**
 * Les montants sont en unités mineures entières (constitution : pas de cumul
 * flottant pour l'argent). Chaque ligne est arrondie une fois ; les totaux sont
 * des sommes d'entiers, la TVA et la remise sont arrondies à l'unité mineure.
 */
export class FinanceEngine {
  public readonly version = 'finance-1.1.0';
  public calculate(input: FinanceInputV1): FinanceEnvelopeV1 {
    validate(input);
    const lines = input.lines.map((line) => {
      const totalCost = Math.round(line.quantity * line.unitCost);
      const unitSale = Math.round(line.unitCost * (1 + line.marginRatio));
      const totalSale = Math.round(line.quantity * unitSale);
      return { ...line, totalCost, unitSale, totalSale, profit: totalSale - totalCost };
    });
    const totalCost = sum(lines.map((line) => line.totalCost));
    const grossSaleHt = sum(lines.map((line) => line.totalSale));
    const discount = Math.round(grossSaleHt * input.discountRatio);
    const totalSaleHt = grossSaleHt - discount;
    const vatAmount = Math.round(totalSaleHt * input.vatRatio);
    const totalTtc = totalSaleHt + vatAmount;
    const downPayment = Math.round(totalTtc * input.downPaymentRatio);
    const simulation = simulateRetainedSystem(input);
    const pvCost = lines.find((line) => line.key === 'modules')?.totalCost ?? 0;
    const batteryCost = lines.find((line) => line.key === 'batteries')?.totalCost ?? 0;
    const inverterCost = lines.find((line) => line.key === 'inverters')?.totalCost ?? 0;
    const annualMaintenanceCost = Math.round(pvCost * input.pvMaintenanceRatioPerYear + batteryCost * input.batteryMaintenanceRatioPerYear + inverterCost * input.inverterMaintenanceRatioPerYear);
    const discountFactor = (year: number) => 1 / ((1 + input.discountRateRatio) ** year);
    const annuity = Array.from({ length: input.projectLifetimeYears }, (_, year) => discountFactor(year + 1)).reduce((total, value) => total + value, 0);
    const replacements = replacementCosts(input, batteryCost, inverterCost, discountFactor);
    const actualizedLifecycleCost = Math.round(totalTtc + annualMaintenanceCost * annuity + replacements.actualized);
    const actualizedServedEnergyKwh = simulation.servedEnergyKwh * annuity;
    const lcoeActualized = actualizedLifecycleCost / Math.max(actualizedServedEnergyKwh, 0.001);
    const co2AvoidedKg = simulation.servedEnergyKwh * input.emissionFactorKgPerKwh * input.projectLifetimeYears * input.selfConsumptionRatio;
    const output: FinanceOutputV1 = {
      lines, totalCost, grossSaleHt, discount, totalSaleHt, profit: totalSaleHt - totalCost,
      averageMarginRatio: totalCost > 0 ? (totalSaleHt - totalCost) / totalCost : 0, vatAmount, totalTtc,
      downPayment, balanceDue: totalTtc - downPayment,
      wattPeakPrice: totalTtc / Math.max(input.pvPeakKw * 1000, 0.001), simulation,
      lifecycle: {
        annualMaintenanceCost, actualizedReplacementCost: Math.round(replacements.actualized), replacementCostNominal: replacements.nominal,
        actualizedLifecycleCost, actualizedServedEnergyKwh, lcoeActualized,
        svi: lcoeActualized / Math.max(input.gridTariffPerKwh, 0.001),
        co2AvoidedKg,
        // Arbres qui absorberaient ce CO₂ pendant la même durée, pas « arbres-années ».
        co2AvoidedTrees: co2AvoidedKg / (CO2_ABSORBED_PER_TREE_KG_PER_YEAR * input.projectLifetimeYears),
        dieselEquivalentInvestment: Math.round(input.inverterKw * input.dieselSpecificCostPerKw),
      },
    };
    return {
      engineVersion: this.version, inputHash: hashInput(input), output, issues: [],
      trace: [
        trace('totalTtc', 'Σ round(q·round(c·(1+m))) − remise + TVA', 'finance-1.1.0', ['lines', 'discountRatio', 'vatRatio']),
        trace('simulation.sri', 'hourly-balance:(1−LOLP)·(1−LPSP)', 'research-010-R2', ['pvPeakKw', 'storageKwh', 'inverterKw', 'hourlyLoadKwh', 'hourlyPoaWm2']),
        trace('lifecycle.lcoeActualized', 'LCC_act/Σ E_served·annuity', 'KYA-methodology-2026', ['totalTtc', 'maintenance', 'replacements', 'discountRateRatio']),
        trace('lifecycle.co2AvoidedTrees', 'CO2_kg/(22·years)', 'EEA-tree-22kg', ['emissionFactorKgPerKwh', 'projectLifetimeYears']),
      ],
    };
  }
}

export function simulateRetainedSystem(input: Pick<FinanceInputV1, 'pvPeakKw' | 'storageKwh' | 'inverterKw' | 'hourlyLoadKwh' | 'hourlyPoaWm2' | 'systemPerformanceRatio' | 'inverterEfficiencyRatio' | 'batteryEfficiencyRatio'>): RetainedSystemSimulationV1 {
  const balance = simulateHourlyEnergyBalance({
    pvPeakKw: input.pvPeakKw, usableStorageKwh: input.storageKwh, inverterKw: input.inverterKw,
    hourlyLoadKwh: input.hourlyLoadKwh, hourlyPoaWm2: input.hourlyPoaWm2,
    performanceRatio: input.systemPerformanceRatio, inverterEfficiency: input.inverterEfficiencyRatio, batteryEfficiency: input.batteryEfficiencyRatio,
  });
  return { annualProductionKwh: balance.annualProductionKwh, servedEnergyKwh: balance.servedEnergyKwh, lpsp: balance.lpsp, lolp: balance.lolp, sri: balance.sri };
}

function replacementCosts(input: FinanceInputV1, batteryCost: number, inverterCost: number, discountFactor: (year: number) => number) {
  let nominal = 0; let actualized = 0;
  for (let y = input.batteryLifetimeYears; y < input.projectLifetimeYears; y += input.batteryLifetimeYears) { nominal += batteryCost; actualized += batteryCost * discountFactor(y); }
  for (let y = input.inverterLifetimeYears; y < input.projectLifetimeYears; y += input.inverterLifetimeYears) { nominal += inverterCost; actualized += inverterCost * discountFactor(y); }
  return { nominal, actualized };
}
function validate(input: FinanceInputV1) {
  if (input.pvPeakKw <= 0 || input.inverterKw <= 0 || input.storageKwh < 0 || !isAcceptedLoadLength(input.hourlyLoadKwh.length) || input.hourlyPoaWm2.length !== 8760) throw new Error('FINANCE_INPUT_INCOMPLETE');
  const ratios = [input.vatRatio, input.discountRatio, input.downPaymentRatio, input.systemPerformanceRatio, input.inverterEfficiencyRatio, input.batteryEfficiencyRatio, input.discountRateRatio, input.selfConsumptionRatio];
  if (ratios.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('FINANCE_RATIO_INVALID');
  if (input.lines.some((line) => !Number.isFinite(line.quantity) || line.quantity < 0 || !Number.isFinite(line.unitCost) || line.unitCost < 0)) throw new Error('FINANCE_LINE_INVALID');
}
function sum(values: readonly number[]) { return values.reduce((total, value) => total + value, 0); }
