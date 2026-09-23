import type { PresizingCandidateV1, PresizingEnvelopeV1, PresizingInputV1, PresizingProgress } from './contracts.js';

const GRID = Array.from({ length: 11 }, (_, index) => index / 10);

export class PresizingEngine {
  public readonly version = 'presizing-1.1.0';

  public async calculate(input: PresizingInputV1, onProgress?: (progress: PresizingProgress) => void, yieldControl: () => Promise<void> = () => Promise.resolve()): Promise<PresizingEnvelopeV1> {
    validateInput(input);
    const pairs = input.yEn <= 0 || input.yEn >= 1 ? 11 : 121;
    const candidates: PresizingCandidateV1[] = [];
    let completed = 0;
    for (const alphaN of GRID) {
      for (const alphaA of GRID) {
        if (input.yEn <= 0 && alphaA !== 0) continue;
        if (input.yEn >= 1 && alphaN !== 0) continue;
        const candidate = evaluateCandidate(input, alphaA, alphaN);
        if (candidate !== null) candidates.push(candidate);
        completed += 1;
        onProgress?.({ completed, total: pairs, alphaA, alphaN });
        await yieldControl();
      }
    }
    if (candidates.length === 0) throw new Error('NO_DIMENSIONABLE_CONFIG');
    const sriMin = (1 - input.lolpMax) * (1 - input.lpspMax);
    const reliableCandidates = candidates.filter((candidate) => candidate.sri >= sriMin);
    const selected = (reliableCandidates.length > 0 ? reliableCandidates : candidates)
      .toSorted((a, b) => reliableCandidates.length > 0 ? a.svi - b.svi || b.co2AvoidedKg - a.co2AvoidedKg : b.sri - a.sri || a.svi - b.svi)[0]!;
    return {
      engineVersion: this.version,
      inputHash: hash(JSON.stringify(input)),
      output: { evaluatedPairs: completed, totalPairs: pairs, selected, sriMin, reliable: reliableCandidates.length > 0, viable: selected.svi < 1 },
      issues: reliableCandidates.length > 0 ? [] : [{ code: 'SRI_TARGET_NOT_REACHED', severity: 'warning', message: 'Aucune configuration n’atteint le seuil de fiabilité.', sourceId: this.version }],
      trace: [],
    };
  }
}

function evaluateCandidate(input: PresizingInputV1, alphaA: number, alphaN: number): PresizingCandidateV1 | null {
  const annualPoaKwh = input.hourlyPoaWm2.reduce((sum, value) => sum + value / 1000, 0);
  if (annualPoaKwh <= 0 || input.dailyEnergyWh <= 0) return null;
  const dailyEnergyKwh = input.dailyEnergyWh / 1000;
  const conversionEfficiency = input.inverterEfficiency;
  const storageEfficiency = input.batteryEfficiency;
  const exergyNeedKwh = dailyEnergyKwh / (conversionEfficiency * storageEfficiency)
    * ((-1 - alphaN + alphaA + storageEfficiency) * input.yEn + alphaN + 1);
  const pvPeakKw = exergyNeedKwh / (annualPoaKwh / 365 * input.systemPr);
  // Nominal storage capacity S_t, Eq. (18) of the validated methodology:
  // S_t = E_load,T * [(alphaA - alphaN - 1) * yEn + 1 + alphaN]. No
  // conversion/storage efficiency factor belongs here — S_t is already the
  // nominal (nameplate) battery capacity; DoD and battery technology are
  // deliberately deferred to the equipment-sizing page. A previous version of
  // this formula divided by (conversionEfficiency * storageEfficiency), which
  // does not appear in Eq. (18) and silently inflated the sized capacity by
  // roughly 1/(eta_c*eta_s) (~17% with the current defaults).
  const storageKwh = dailyEnergyKwh * ((alphaA - alphaN - 1) * input.yEn + 1 + alphaN);
  if (pvPeakKw <= 0 || storageKwh < 0) return null;
  const inverterKw = Math.max(input.peakPowerW / 1000, pvPeakKw * input.inverterEfficiency);
  // La charge est soit une journée type répétée, soit une année complète. Le
  // modulo porte donc sur sa propre longueur : sur 8 760 valeurs il ne boucle
  // jamais, et la saisonnalité réellement saisie atteint la simulation au lieu
  // d'être écrasée par une moyenne.
  const loadHours = input.hourlyLoadWh.length;
  let storedKwh = storageKwh; let lossHours = 0; let served = 0; let production = 0; let demanded = 0;
  for (let hour = 0; hour < input.hourlyPoaWm2.length; hour += 1) {
    const loadKwh = (input.hourlyLoadWh[hour % loadHours] ?? 0) / 1000;
    demanded += loadKwh;
    const pvKwh = pvPeakKw * (input.hourlyPoaWm2[hour]! / 1000) * input.systemPr;
    production += pvKwh;
    const direct = Math.min(loadKwh, pvKwh * input.inverterEfficiency);
    const deficit = loadKwh - direct;
    const discharged = Math.min(storedKwh, deficit / Math.max(input.batteryEfficiency, 0.01));
    storedKwh = Math.min(storageKwh, Math.max(0, storedKwh + Math.max(0, pvKwh - direct) * input.batteryEfficiency - discharged));
    served += direct + discharged * input.batteryEfficiency;
    if (direct + discharged * input.batteryEfficiency + 1e-9 < loadKwh) lossHours += 1;
  }
  // Le besoin total se lit sur la simulation elle-même. Le déduire d'une
  // énergie journalière multipliée par 365 supposait une année plate.
  const totalLoadKwh = demanded;
  const servedEnergyKwh = Math.min(served, totalLoadKwh);
  const lpsp = Math.max(0, Math.min(1, 1 - servedEnergyKwh / Math.max(totalLoadKwh, 0.001)));
  const lolp = lossHours / input.hourlyPoaWm2.length; const sri = (1 - lolp) * (1 - lpsp);
  const investment = pvPeakKw * input.pvSpecificCostPerKw + storageKwh * input.batterySpecificCostPerKwh + inverterKw * input.inverterSpecificCostPerKw;
  const discountFactor = (year: number) => 1 / ((1 + input.discountRateRatio) ** year);
  const annuity = Array.from({ length: input.projectLifetimeYears }, (_, index) => discountFactor(index + 1)).reduce((sum, value) => sum + value, 0);
  const maintenance = (pvPeakKw * input.pvSpecificCostPerKw * input.pvMaintenanceRatioPerYear
    + storageKwh * input.batterySpecificCostPerKwh * input.batteryMaintenanceRatioPerYear
    + inverterKw * input.inverterSpecificCostPerKw * input.inverterMaintenanceRatioPerYear) * annuity;
  const replacement = replacementCost(pvPeakKw, storageKwh, inverterKw, input, discountFactor);
  const lcc = investment + maintenance + replacement;
  const discountedServedEnergy = servedEnergyKwh * annuity;
  const lcoe = lcc / Math.max(discountedServedEnergy, 0.001); const svi = lcoe / Math.max(input.gridTariffPerKwh, 0.001);
  const co2AvoidedKg = servedEnergyKwh * input.emissionFactorKgPerKwh;
  const carbonFactorKgPerKwh = co2AvoidedKg / Math.max(servedEnergyKwh, 0.001);
  return { alphaA, alphaN, pvPeakKw, storageKwh, inverterKw, annualProductionKwh: production, servedEnergyKwh, lcc, lpsp, lolp, sri, lcoe, svi, carbonFactorKgPerKwh, co2AvoidedKg };
}
function replacementCost(pvPeakKw: number, storageKwh: number, inverterKw: number, input: PresizingInputV1, discountFactor: (year: number) => number): number {
  let total = 0;
  for (let year = input.pvLifetimeYears; year < input.projectLifetimeYears; year += input.pvLifetimeYears) total += pvPeakKw * input.pvSpecificCostPerKw * discountFactor(year);
  for (let year = input.batteryLifetimeYears; year < input.projectLifetimeYears; year += input.batteryLifetimeYears) total += storageKwh * input.batterySpecificCostPerKwh * discountFactor(year);
  for (let year = input.inverterLifetimeYears; year < input.projectLifetimeYears; year += input.inverterLifetimeYears) total += inverterKw * input.inverterSpecificCostPerKw * discountFactor(year);
  return total;
}

/**
 * Longueurs de charge admises.
 *
 * 24 : une journée type, répétée sur l'année météo. 8 760 : l'année réelle,
 * heure par heure. Rien entre les deux — une série partielle laisserait le
 * modulo fabriquer une saisonnalité qui n'existe pas.
 */
export function isAcceptedLoadLength(length: number): boolean {
  return length === 24 || length === 8760;
}

function validateInput(input: PresizingInputV1): void {
  if (!Number.isFinite(input.dailyEnergyWh) || input.dailyEnergyWh <= 0) throw new Error('LOAD_ENERGY_MISSING');
  if (!Number.isFinite(input.yEn) || input.yEn < 0 || input.yEn > 1) throw new Error('YEN_OUT_OF_RANGE');
  if (!isAcceptedLoadLength(input.hourlyLoadWh.length) || input.hourlyPoaWm2.length !== 8760) throw new Error('HOURLY_DATA_INCOMPLETE');
  if (input.hourlyLoadWh.some((value) => !Number.isFinite(value) || value < 0) || input.hourlyPoaWm2.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('HOURLY_DATA_INVALID');
  const ratios = [input.lpspMax, input.lolpMax, input.systemPr, input.inverterEfficiency, input.batteryEfficiency];
  if (ratios.some((value) => !Number.isFinite(value) || value < 0 || value > 1) || input.systemPr === 0 || input.inverterEfficiency === 0 || input.batteryEfficiency === 0) throw new Error('ASSUMPTION_OUT_OF_RANGE');
  const nonNegative = [input.peakPowerW, input.pvSpecificCostPerKw, input.batterySpecificCostPerKwh, input.inverterSpecificCostPerKw, input.gridTariffPerKwh, input.emissionFactorKgPerKwh, input.pvMaintenanceRatioPerYear, input.batteryMaintenanceRatioPerYear, input.inverterMaintenanceRatioPerYear, input.discountRateRatio];
  if (nonNegative.some((value) => !Number.isFinite(value) || value < 0) || input.gridTariffPerKwh === 0) throw new Error('ASSUMPTION_OUT_OF_RANGE');
  const lifetimes = [input.projectLifetimeYears, input.pvLifetimeYears, input.batteryLifetimeYears, input.inverterLifetimeYears];
  if (lifetimes.some((value) => !Number.isInteger(value) || value <= 0)) throw new Error('ASSUMPTION_OUT_OF_RANGE');
}
function hash(value: string): string { let result = 2166136261; for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619); return (result >>> 0).toString(16).padStart(8, '0'); }
