/**
 * Bilan énergétique horaire d'un système autonome tout-en-un.
 *
 * Unique autorité pour le prédimensionnement et l'évaluation du système retenu :
 * un même système doit produire le même SRI dans les deux étapes. Conventions
 * (research.md R2) :
 * - la production PV est côté DC ; la charge est côté AC ;
 * - le rendement onduleur s'applique à la production directe et à la décharge ;
 * - la puissance onduleur plafonne la somme directe + décharge ;
 * - le rendement batterie s'applique à la charge et à la décharge ;
 * - `usableStorageKwh` est l'énergie utile (la DoD est appliquée au dimensionnement) ;
 * - une année de mise en régime précède l'année mesurée, qui repart de l'état
 *   de charge final : le résultat ne dépend pas d'un état initial arbitraire.
 */
export interface HourlyBalanceInput {
  readonly pvPeakKw: number;
  readonly usableStorageKwh: number;
  readonly inverterKw: number;
  /** 24 valeurs (journée type répétée) ou 8 760 valeurs, en kWh AC par heure. */
  readonly hourlyLoadKwh: readonly number[];
  /** 8 760 valeurs d'irradiance en plan des modules, W/m². */
  readonly hourlyPoaWm2: readonly number[];
  readonly performanceRatio: number;
  readonly inverterEfficiency: number;
  readonly batteryEfficiency: number;
}

export interface HourlyBalanceResult {
  readonly annualProductionKwh: number;
  readonly demandedEnergyKwh: number;
  readonly servedEnergyKwh: number;
  readonly lossHours: number;
  readonly lpsp: number;
  readonly lolp: number;
  readonly sri: number;
  readonly finalStoredKwh: number;
}

const EPSILON_KWH = 1e-9;

export function simulateHourlyEnergyBalance(input: HourlyBalanceInput): HourlyBalanceResult {
  const warmUp = runYear(input, input.usableStorageKwh / 2);
  return runYear(input, warmUp.finalStoredKwh);
}

function runYear(input: HourlyBalanceInput, initialStoredKwh: number): HourlyBalanceResult {
  const loadHours = input.hourlyLoadKwh.length;
  const etaInverter = Math.max(input.inverterEfficiency, 0.01);
  const etaBattery = Math.max(input.batteryEfficiency, 0.01);
  const capacity = Math.max(0, input.usableStorageKwh);
  const inverterCap = Math.max(0, input.inverterKw);
  let stored = Math.min(capacity, Math.max(0, initialStoredKwh));
  let production = 0; let demanded = 0; let served = 0; let lossHours = 0;
  for (let hour = 0; hour < input.hourlyPoaWm2.length; hour += 1) {
    const load = input.hourlyLoadKwh[hour % loadHours] ?? 0;
    demanded += load;
    const pvDc = input.pvPeakKw * (input.hourlyPoaWm2[hour]! / 1000) * input.performanceRatio;
    production += pvDc;
    const directAc = Math.min(load, pvDc * etaInverter, inverterCap);
    const deficitAc = load - directAc;
    const dischargeAc = Math.min(deficitAc, inverterCap - directAc, stored * etaBattery * etaInverter);
    stored -= dischargeAc / (etaBattery * etaInverter);
    const surplusDc = Math.max(0, pvDc - directAc / etaInverter);
    stored = Math.min(capacity, Math.max(0, stored + surplusDc * etaBattery));
    const delivered = directAc + dischargeAc;
    served += delivered;
    if (delivered + EPSILON_KWH < load) lossHours += 1;
  }
  const servedEnergyKwh = Math.min(served, demanded);
  const lpsp = Math.max(0, Math.min(1, 1 - servedEnergyKwh / Math.max(demanded, 0.001)));
  const lolp = lossHours / Math.max(input.hourlyPoaWm2.length, 1);
  return { annualProductionKwh: production, demandedEnergyKwh: demanded, servedEnergyKwh, lossHours, lpsp, lolp, sri: (1 - lolp) * (1 - lpsp), finalStoredKwh: stored };
}
