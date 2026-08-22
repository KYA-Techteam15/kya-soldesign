import type { CalculationEnvelope } from '@ksd/domain';

export interface FinanceLineInputV1 {
  readonly key: string; readonly label: string; readonly quantity: number;
  readonly unitCost: number; readonly marginRatio: number;
}

export interface FinanceInputV1 {
  readonly lines: readonly FinanceLineInputV1[];
  readonly vatRatio: number; readonly discountRatio: number; readonly downPaymentRatio: number;
  readonly pvPeakKw: number; readonly storageKwh: number; readonly inverterKw: number;
  readonly hourlyLoadKwh: readonly number[]; readonly hourlyPoaWm2: readonly number[];
  readonly systemPerformanceRatio: number; readonly inverterEfficiencyRatio: number; readonly batteryEfficiencyRatio: number;
  readonly projectLifetimeYears: number; readonly batteryLifetimeYears: number; readonly inverterLifetimeYears: number;
  readonly pvMaintenanceRatioPerYear: number; readonly batteryMaintenanceRatioPerYear: number; readonly inverterMaintenanceRatioPerYear: number;
  readonly discountRateRatio: number; readonly gridTariffPerKwh: number; readonly emissionFactorKgPerKwh: number;
  readonly selfConsumptionRatio: number; readonly dieselSpecificCostPerKw: number;
}

export interface FinanceLineResultV1 extends FinanceLineInputV1 { readonly totalCost: number; readonly unitSale: number; readonly totalSale: number; readonly profit: number; }
export interface RetainedSystemSimulationV1 { readonly annualProductionKwh: number; readonly servedEnergyKwh: number; readonly lpsp: number; readonly lolp: number; readonly sri: number; }
export interface FinanceOutputV1 {
  readonly lines: readonly FinanceLineResultV1[];
  readonly totalCost: number; readonly grossSaleHt: number; readonly discount: number; readonly totalSaleHt: number; readonly profit: number; readonly averageMarginRatio: number;
  readonly vatAmount: number; readonly totalTtc: number; readonly downPayment: number; readonly balanceDue: number; readonly wattPeakPrice: number;
  readonly simulation: RetainedSystemSimulationV1;
  readonly lifecycle: { readonly annualMaintenanceCost: number; readonly actualizedReplacementCost: number; readonly replacementCostNominal: number; readonly actualizedLifecycleCost: number; readonly actualizedServedEnergyKwh: number; readonly lcoeActualized: number; readonly svi: number; readonly co2AvoidedKg: number; readonly co2AvoidedTrees: number; readonly dieselEquivalentInvestment: number };
}
export type FinanceEnvelopeV1 = CalculationEnvelope<FinanceOutputV1>;
