import type { PresizingCandidateV1, PresizingEnvelopeV1, PresizingInputV1, PresizingProgress } from './contracts.js';

const GRID = Array.from({ length: 11 }, (_, index) => index / 10);

export class PresizingEngine {
  public readonly version = 'presizing-1.0.0';

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
  const pvPeakKw = input.dailyEnergyWh / 1000 * (1 + alphaN) / (annualPoaKwh / 365 * input.systemPr * input.inverterEfficiency);
  // Page 2 reports useful storage energy directly. DoD and battery technology
  // are deliberately deferred to the equipment-sizing page.
  const storageKwh = input.dailyEnergyWh / 1000 * (1 + alphaN) * (1 - alphaA);
  const inverterKw = Math.max(input.peakPowerW / 1000, pvPeakKw * input.inverterEfficiency);
  let storedKwh = storageKwh; let lossHours = 0; let served = 0; let production = 0;
  for (let hour = 0; hour < input.hourlyPoaWm2.length; hour += 1) {
    const loadKwh = (input.hourlyLoadWh[hour % 24] ?? 0) / 1000;
    const pvKwh = pvPeakKw * (input.hourlyPoaWm2[hour]! / 1000) * input.systemPr;
    production += pvKwh;
    const direct = Math.min(loadKwh, pvKwh * input.inverterEfficiency);
    const deficit = loadKwh - direct;
    const discharged = Math.min(storedKwh, deficit / Math.max(input.batteryEfficiency, 0.01));
    storedKwh = Math.min(storageKwh, Math.max(0, storedKwh + Math.max(0, pvKwh - direct) * input.batteryEfficiency - discharged));
    served += direct + discharged * input.batteryEfficiency;
    if (direct + discharged * input.batteryEfficiency + 1e-9 < loadKwh) lossHours += 1;
  }
  const totalLoadKwh = input.dailyEnergyWh / 1000 * 365;
  const lpsp = Math.max(0, Math.min(1, 1 - served / Math.max(totalLoadKwh, 0.001)));
  const lolp = lossHours / input.hourlyPoaWm2.length; const sri = (1 - lolp) * (1 - lpsp);
  const investment = pvPeakKw * input.pvSpecificCostPerKw + storageKwh * input.batterySpecificCostPerKwh + inverterKw * input.inverterSpecificCostPerKw;
  const lcoe = investment / Math.max(production, 0.001); const svi = lcoe / Math.max(input.gridTariffPerKwh, 0.001);
  return { alphaA, alphaN, pvPeakKw, storageKwh, inverterKw, annualProductionKwh: production, lpsp, lolp, sri, lcoe, svi, co2AvoidedKg: Math.min(production, served) * input.emissionFactorKgPerKwh };
}

function validateInput(input: PresizingInputV1): void {
  if (!Number.isFinite(input.dailyEnergyWh) || input.dailyEnergyWh <= 0) throw new Error('LOAD_ENERGY_MISSING');
  if (!Number.isFinite(input.yEn) || input.yEn < 0 || input.yEn > 1) throw new Error('YEN_OUT_OF_RANGE');
  if (input.hourlyLoadWh.length !== 24 || input.hourlyPoaWm2.length !== 8760) throw new Error('HOURLY_DATA_INCOMPLETE');
  if (input.hourlyLoadWh.some((value) => !Number.isFinite(value) || value < 0) || input.hourlyPoaWm2.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('HOURLY_DATA_INVALID');
  const ratios = [input.lpspMax, input.lolpMax, input.systemPr, input.inverterEfficiency, input.batteryEfficiency];
  if (ratios.some((value) => !Number.isFinite(value) || value < 0 || value > 1) || input.systemPr === 0 || input.inverterEfficiency === 0 || input.batteryEfficiency === 0) throw new Error('ASSUMPTION_OUT_OF_RANGE');
  const nonNegative = [input.peakPowerW, input.pvSpecificCostPerKw, input.batterySpecificCostPerKwh, input.inverterSpecificCostPerKw, input.gridTariffPerKwh, input.emissionFactorKgPerKwh];
  if (nonNegative.some((value) => !Number.isFinite(value) || value < 0) || input.gridTariffPerKwh === 0) throw new Error('ASSUMPTION_OUT_OF_RANGE');
}
function hash(value: string): string { let result = 2166136261; for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 16777619); return (result >>> 0).toString(16).padStart(8, '0'); }
