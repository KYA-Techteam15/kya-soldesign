import type { FinanceEnvelopeV1, FinanceInputV1, FinanceOutputV1, RetainedSystemSimulationV1 } from './contracts.js';
import { isAcceptedLoadLength } from '../presizing/engine.js';

export class FinanceEngine {
  public readonly version = 'finance-1.0.0';
  public calculate(input: FinanceInputV1): FinanceEnvelopeV1 {
    validate(input);
    const lines = input.lines.map((line) => {
      const totalCost = line.quantity * line.unitCost;
      const unitSale = line.unitCost * (1 + line.marginRatio);
      const totalSale = line.quantity * unitSale;
      return { ...line, totalCost, unitSale, totalSale, profit: totalSale - totalCost };
    });
    const totalCost = sum(lines.map((line) => line.totalCost));
    const grossSaleHt = sum(lines.map((line) => line.totalSale));
    const discount = grossSaleHt * input.discountRatio;
    const totalSaleHt = grossSaleHt - discount;
    const vatAmount = totalSaleHt * input.vatRatio;
    const totalTtc = totalSaleHt + vatAmount;
    const simulation = simulateRetainedSystem(input);
    const pvCost = lines.find((line) => line.key === 'modules')?.totalCost ?? 0;
    const batteryCost = lines.find((line) => line.key === 'batteries')?.totalCost ?? 0;
    const inverterCost = lines.find((line) => line.key === 'inverters')?.totalCost ?? 0;
    const annualMaintenanceCost = pvCost * input.pvMaintenanceRatioPerYear + batteryCost * input.batteryMaintenanceRatioPerYear + inverterCost * input.inverterMaintenanceRatioPerYear;
    const discountFactor = (year: number) => 1 / ((1 + input.discountRateRatio) ** year);
    const annuity = sum(Array.from({ length: input.projectLifetimeYears }, (_, year) => discountFactor(year + 1)));
    const replacements = replacementCosts(input, batteryCost, inverterCost, discountFactor);
    const actualizedLifecycleCost = totalTtc + annualMaintenanceCost * annuity + replacements.actualized;
    const actualizedServedEnergyKwh = simulation.servedEnergyKwh * annuity;
    const lcoeActualized = actualizedLifecycleCost / Math.max(actualizedServedEnergyKwh, 0.001);
    const output: FinanceOutputV1 = {
      lines, totalCost, grossSaleHt, discount, totalSaleHt, profit: totalSaleHt - totalCost,
      averageMarginRatio: totalCost > 0 ? (totalSaleHt - totalCost) / totalCost : 0, vatAmount, totalTtc,
      downPayment: totalTtc * input.downPaymentRatio, balanceDue: totalTtc * (1 - input.downPaymentRatio),
      wattPeakPrice: totalTtc / Math.max(input.pvPeakKw * 1000, 0.001), simulation,
      lifecycle: { annualMaintenanceCost, actualizedReplacementCost: replacements.actualized, replacementCostNominal: replacements.nominal, actualizedLifecycleCost, actualizedServedEnergyKwh, lcoeActualized, svi: lcoeActualized / Math.max(input.gridTariffPerKwh, 0.001), co2AvoidedKg: simulation.servedEnergyKwh * input.emissionFactorKgPerKwh * input.projectLifetimeYears * input.selfConsumptionRatio, co2AvoidedTrees: simulation.servedEnergyKwh * input.emissionFactorKgPerKwh * input.projectLifetimeYears * input.selfConsumptionRatio / 22, dieselEquivalentInvestment: input.inverterKw * input.dieselSpecificCostPerKw },
    };
    return { engineVersion: this.version, inputHash: hash(JSON.stringify(input)), output, issues: [], trace: [] };
  }
}

export function simulateRetainedSystem(input: Pick<FinanceInputV1, 'pvPeakKw' | 'storageKwh' | 'inverterKw' | 'hourlyLoadKwh' | 'hourlyPoaWm2' | 'systemPerformanceRatio' | 'inverterEfficiencyRatio' | 'batteryEfficiencyRatio'>): RetainedSystemSimulationV1 {
  // Même règle que le prédimensionnement : la charge vaut 24 valeurs répétées
  // ou 8 760 valeurs prises telles quelles. Les deux moteurs doivent lire la
  // même année, sans quoi le SRI du dossier et celui du rapport divergent.
  const loadHours = input.hourlyLoadKwh.length;
  let stored = input.storageKwh; let lossHours = 0; let served = 0; let production = 0; let demanded = 0;
  for (let hour = 0; hour < input.hourlyPoaWm2.length; hour += 1) {
    const load = input.hourlyLoadKwh[hour % loadHours] ?? 0;
    demanded += load;
    const pvDc = input.pvPeakKw * (input.hourlyPoaWm2[hour]! / 1000) * input.systemPerformanceRatio;
    production += pvDc;
    const availableAc = Math.min(input.inverterKw, pvDc * input.inverterEfficiencyRatio);
    const direct = Math.min(load, availableAc);
    const deficit = load - direct;
    const discharged = Math.min(stored, deficit / Math.max(input.batteryEfficiencyRatio, 0.01));
    const delivered = direct + discharged * input.batteryEfficiencyRatio;
    const pvSurplusDc = Math.max(0, pvDc - direct / Math.max(input.inverterEfficiencyRatio, 0.01));
    stored = Math.min(input.storageKwh, Math.max(0, stored + pvSurplusDc * input.batteryEfficiencyRatio - discharged));
    served += delivered; if (delivered + 1e-9 < load) lossHours += 1;
  }
  const totalLoad = demanded;
  const servedEnergyKwh = Math.min(served, totalLoad);
  const lpsp = Math.max(0, Math.min(1, 1 - servedEnergyKwh / Math.max(totalLoad, 0.001)));
  const lolp = lossHours / input.hourlyPoaWm2.length;
  return { annualProductionKwh: production, servedEnergyKwh, lpsp, lolp, sri: (1 - lolp) * (1 - lpsp) };
}
function replacementCosts(input: FinanceInputV1, batteryCost: number, inverterCost: number, discountFactor: (year: number) => number) { let nominal = 0; let actualized = 0; for (let y = input.batteryLifetimeYears; y < input.projectLifetimeYears; y += input.batteryLifetimeYears) { nominal += batteryCost; actualized += batteryCost * discountFactor(y); } for (let y = input.inverterLifetimeYears; y < input.projectLifetimeYears; y += input.inverterLifetimeYears) { nominal += inverterCost; actualized += inverterCost * discountFactor(y); } return { nominal, actualized }; }
function validate(input: FinanceInputV1) { if (input.pvPeakKw <= 0 || input.inverterKw <= 0 || input.storageKwh < 0 || !isAcceptedLoadLength(input.hourlyLoadKwh.length) || input.hourlyPoaWm2.length !== 8760) throw new Error('FINANCE_INPUT_INCOMPLETE'); const values = [input.vatRatio,input.discountRatio,input.downPaymentRatio,input.systemPerformanceRatio,input.inverterEfficiencyRatio,input.batteryEfficiencyRatio,input.discountRateRatio,input.selfConsumptionRatio]; if (values.some((v) => !Number.isFinite(v) || v < 0 || v > 1)) throw new Error('FINANCE_RATIO_INVALID'); }
function sum(values: readonly number[]) { return values.reduce((total, value) => total + value, 0); }
function hash(value: string) { let result = 2166136261; for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619); return (result >>> 0).toString(16).padStart(8, '0'); }
