import { solarResourceAnalysisInputV1Schema, type SolarResourceAnalysisInputV1 } from '@ksd/domain';
import { hashTechnicalInput } from '../aio/inputHash.js';
import type { KlucherInput, PlaneOfArrayIrradiance, SolarPosition, SolarResourceAnalysisEnvelopeV1 } from './contracts.js';

const degreesToRadians = Math.PI / 180;
const radiansToDegrees = 180 / Math.PI;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/** CALC-P1-008 — deterministic NOAA fractional-year solar position, north-clockwise azimuth. */
export function calculateSolarPositionNoaa(timestampUtcIso: string, latitudeDeg: number, longitudeDeg: number): SolarPosition {
  const timestamp = new Date(timestampUtcIso);
  if (!Number.isFinite(timestamp.getTime())) throw new RangeError('timestampUtcIso must be a valid instant');
  if (!Number.isFinite(latitudeDeg) || latitudeDeg < -90 || latitudeDeg > 90) throw new RangeError('latitudeDeg is invalid');
  if (!Number.isFinite(longitudeDeg) || longitudeDeg < -180 || longitudeDeg > 180) throw new RangeError('longitudeDeg is invalid');
  const startOfYear = Date.UTC(timestamp.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((timestamp.getTime() - startOfYear) / 86_400_000) + 1;
  const hourUtc = timestamp.getUTCHours() + timestamp.getUTCMinutes() / 60 + timestamp.getUTCSeconds() / 3_600;
  const fractionalYear = (2 * Math.PI / 365) * (dayOfYear - 1 + (hourUtc - 12) / 24);
  const equationOfTimeMinutes = 229.18 * (0.000075 + 0.001868 * Math.cos(fractionalYear) - 0.032077 * Math.sin(fractionalYear)
    - 0.014615 * Math.cos(2 * fractionalYear) - 0.040849 * Math.sin(2 * fractionalYear));
  const declinationRad = 0.006918 - 0.399912 * Math.cos(fractionalYear) + 0.070257 * Math.sin(fractionalYear)
    - 0.006758 * Math.cos(2 * fractionalYear) + 0.000907 * Math.sin(2 * fractionalYear)
    - 0.002697 * Math.cos(3 * fractionalYear) + 0.00148 * Math.sin(3 * fractionalYear);
  const trueSolarMinutes = ((hourUtc * 60 + equationOfTimeMinutes + 4 * longitudeDeg) % 1_440 + 1_440) % 1_440;
  const hourAngleDeg = trueSolarMinutes / 4 - 180;
  const hourAngleRad = hourAngleDeg * degreesToRadians;
  const latitudeRad = latitudeDeg * degreesToRadians;
  const cosZenith = clamp(Math.sin(latitudeRad) * Math.sin(declinationRad)
    + Math.cos(latitudeRad) * Math.cos(declinationRad) * Math.cos(hourAngleRad), -1, 1);
  const geometricZenithDeg = Math.acos(cosZenith) * radiansToDegrees;
  const geometricElevationDeg = 90 - geometricZenithDeg;
  const refractionDeg = atmosphericRefractionDeg(geometricElevationDeg);
  const zenithDeg = clamp(90 - (geometricElevationDeg + refractionDeg), 0, 180);
  const azimuthDeg = ((Math.atan2(
    Math.sin(hourAngleRad),
    Math.cos(hourAngleRad) * Math.sin(latitudeRad) - Math.tan(declinationRad) * Math.cos(latitudeRad),
  ) * radiansToDegrees + 180) % 360 + 360) % 360;
  return { zenithDeg, azimuthDeg };
}

function atmosphericRefractionDeg(elevationDeg: number): number {
  if (elevationDeg > 85) return 0;
  const tangent = Math.tan(elevationDeg * degreesToRadians);
  let arcSeconds: number;
  if (elevationDeg > 5) arcSeconds = 58.1 / tangent - 0.07 / tangent ** 3 + 0.000086 / tangent ** 5;
  else if (elevationDeg > -0.575) arcSeconds = 1_735 + elevationDeg * (-518.2 + elevationDeg * (103.4 + elevationDeg * (-12.79 + elevationDeg * 0.711)));
  else arcSeconds = -20.774 / tangent;
  return arcSeconds / 3_600;
}

/** CALC-P1-009 — Klucher sky diffuse plus beam and isotropic ground reflection. */
export function transposeKlucher(input: KlucherInput): PlaneOfArrayIrradiance {
  const values = Object.values(input);
  if (values.some((value) => !Number.isFinite(value))) throw new RangeError('Klucher inputs must be finite');
  const tilt = input.surfaceTiltDeg * degreesToRadians;
  const zenith = input.solarZenithDeg * degreesToRadians;
  const azimuthDifference = (input.solarAzimuthDeg - input.surfaceAzimuthDeg) * degreesToRadians;
  const projection = Math.cos(tilt) * Math.cos(zenith) + Math.sin(tilt) * Math.sin(zenith) * Math.cos(azimuthDifference);
  const directWm2 = Math.max(0, input.dniWm2 * projection);
  const ratio = input.ghiWm2 <= 0 ? 0 : input.dhiWm2 / input.ghiWm2;
  const anisotropy = clamp(1 - ratio ** 2, 0, 1);
  const skyDiffuseWm2 = Math.max(0, input.dhiWm2 * 0.5 * (1 + Math.cos(tilt))
    * (1 + anisotropy * Math.sin(tilt / 2) ** 3)
    * (1 + anisotropy * projection ** 2 * Math.sin(zenith) ** 3));
  const groundDiffuseWm2 = Math.max(0, input.ghiWm2 * input.albedo * (1 - Math.cos(tilt)) / 2);
  return { directWm2, skyDiffuseWm2, groundDiffuseWm2, globalWm2: directWm2 + skyDiffuseWm2 + groundDiffuseWm2 };
}

/** CALC-P1-011 — fraction of daily load energy occurring while mean POA reaches the declared threshold. */
export function calculateGamma(meanHourlyPoaWm2: readonly number[], loadHourlyEnergyWh: readonly number[], thresholdWm2: number): number {
  if (meanHourlyPoaWm2.length !== 24 || loadHourlyEnergyWh.length !== 24) throw new RangeError('gamma requires two 24-hour series');
  const totalLoad = loadHourlyEnergyWh.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(totalLoad) || totalLoad <= 0) throw new RangeError('gamma requires a positive finite load');
  const coincidentLoad = loadHourlyEnergyWh.reduce((sum, value, hour) => sum + (meanHourlyPoaWm2[hour]! >= thresholdWm2 ? value : 0), 0);
  return coincidentLoad / totalLoad;
}

/**
 * Partie de l'analyse qui ne dépend que de la série météo, du site et de
 * l'orientation : position solaire, transposition et agrégats. La charge n'y
 * entre pas ; un appelant peut donc la réutiliser tant que ces entrées ne
 * changent pas, au lieu de retransposer 8 760 heures à chaque modification.
 */
export interface SolarGeometryV1 {
  readonly fingerprint: string;
  readonly observationsHash: string;
  readonly hourlyPoaWm2: readonly number[];
  readonly monthlyAverageDailyPoaKWhM2Day: readonly number[];
  readonly meanHourlyPoaWm2: readonly number[];
  readonly monthlyMeanHourlyPoaWm2: readonly (readonly number[])[];
  readonly annualPoaKWhM2: number;
  readonly designMonth: number | null;
}

/** Empreinte bon marché des entrées géométriques ; toute différence force un recalcul. */
export function solarGeometryFingerprint(input: Pick<SolarResourceAnalysisInputV1, 'latitudeDeg' | 'longitudeDeg' | 'surfaceTiltDeg' | 'surfaceAzimuthDeg' | 'albedo' | 'timezoneOffsetMinutes' | 'intervalMinutes' | 'observations'>): string {
  let ghi = 0; let dni = 0; let dhi = 0;
  for (const observation of input.observations) { ghi += observation.ghiWm2; dni += observation.dniWm2; dhi += observation.dhiWm2; }
  const first = input.observations[0]?.timestampUtcIso ?? '';
  const last = input.observations.at(-1)?.timestampUtcIso ?? '';
  return [input.latitudeDeg, input.longitudeDeg, input.surfaceTiltDeg, input.surfaceAzimuthDeg, input.albedo, input.timezoneOffsetMinutes, input.intervalMinutes, input.observations.length, first, last, ghi, dni, dhi].join('|');
}

/** CALC-P1-008..010 — position, transposition Klucher et agrégats d'une année type. */
export function analyzeSolarGeometry(rawInput: SolarResourceAnalysisInputV1): SolarGeometryV1 {
  const input = solarResourceAnalysisInputV1Schema.parse(rawInput);
  const hourlyPoaWm2 = input.observations.map((observation) => {
    const solar = calculateSolarPositionNoaa(observation.timestampUtcIso, input.latitudeDeg, input.longitudeDeg);
    return transposeKlucher({
      surfaceTiltDeg: input.surfaceTiltDeg, surfaceAzimuthDeg: input.surfaceAzimuthDeg,
      solarZenithDeg: solar.zenithDeg, solarAzimuthDeg: solar.azimuthDeg,
      dniWm2: observation.dniWm2, ghiWm2: observation.ghiWm2, dhiWm2: observation.dhiWm2,
      albedo: input.albedo,
    }).globalWm2;
  });
  const monthlyTotalsWh = Array.from({ length: 12 }, () => 0);
  const monthlyDays = Array.from({ length: 12 }, () => new Set<string>());
  const hourlyTotals = Array.from({ length: 24 }, () => 0);
  const hourlyCounts = Array.from({ length: 24 }, () => 0);
  const monthlyHourlyTotals = Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => 0));
  const monthlyHourlyCounts = Array.from({ length: 12 }, () => Array.from({ length: 24 }, () => 0));
  const offsetMilliseconds = input.timezoneOffsetMinutes * 60_000;
  for (const [index, observation] of input.observations.entries()) {
    const local = new Date(Date.parse(observation.timestampUtcIso) + offsetMilliseconds);
    const month = local.getUTCMonth();
    const hour = local.getUTCHours();
    const poa = hourlyPoaWm2[index]!;
    monthlyTotalsWh[month] = monthlyTotalsWh[month]! + poa * input.intervalMinutes / 60;
    monthlyDays[month]!.add(`${local.getUTCFullYear()}-${local.getUTCMonth()}-${local.getUTCDate()}`);
    hourlyTotals[hour] = hourlyTotals[hour]! + poa;
    hourlyCounts[hour] = hourlyCounts[hour]! + 1;
    monthlyHourlyTotals[month]![hour] = monthlyHourlyTotals[month]![hour]! + poa;
    monthlyHourlyCounts[month]![hour] = monthlyHourlyCounts[month]![hour]! + 1;
  }
  const monthlyAverageDailyPoaKWhM2Day = monthlyTotalsWh.map((total, month) => {
    const days = monthlyDays[month]!.size;
    return days === 0 ? 0 : total / 1_000 / days;
  });
  const meanHourlyPoaWm2 = hourlyTotals.map((total, hour) => hourlyCounts[hour] === 0 ? 0 : total / hourlyCounts[hour]!);
  const monthlyMeanHourlyPoaWm2 = monthlyHourlyTotals.map((totals, month) => totals.map(
    (total, hour) => monthlyHourlyCounts[month]![hour] === 0 ? 0 : total / monthlyHourlyCounts[month]![hour]!,
  ));
  const positiveMonths = monthlyAverageDailyPoaKWhM2Day.map((value, index) => ({ value, month: index + 1 })).filter(({ value }) => value > 0);
  const designMonth = positiveMonths.length === 0 ? null : positiveMonths.reduce((minimum, current) => current.value < minimum.value ? current : minimum).month;
  return {
    fingerprint: solarGeometryFingerprint(input),
    observationsHash: hashTechnicalInput(input.observations),
    hourlyPoaWm2, monthlyAverageDailyPoaKWhM2Day, meanHourlyPoaWm2, monthlyMeanHourlyPoaWm2,
    annualPoaKWhM2: hourlyPoaWm2.reduce((sum, value) => sum + value * input.intervalMinutes / 60, 0) / 1_000,
    designMonth,
  };
}

const analysisInputWithoutObservations = solarResourceAnalysisInputV1Schema.omit({ observations: true });

/**
 * DATA-P1-001 + CALC-P1-008..011 — analyse horaire d'une année type. Une
 * géométrie déjà calculée pour les mêmes entrées (même empreinte) est
 * réutilisée ; sinon elle est recalculée. Le résultat est identique.
 */
export function analyzeSolarResource(rawInput: SolarResourceAnalysisInputV1, precomputed?: SolarGeometryV1): SolarResourceAnalysisEnvelopeV1 {
  const reusable = precomputed !== undefined && precomputed.fingerprint === solarGeometryFingerprint(rawInput);
  const geometry = reusable ? precomputed : analyzeSolarGeometry(rawInput);
  const { observations: _observations, ...rest } = rawInput;
  const input = { ...analysisInputWithoutObservations.parse(rest), observations: rawInput.observations };
  const { hourlyPoaWm2, monthlyAverageDailyPoaKWhM2Day, meanHourlyPoaWm2, monthlyMeanHourlyPoaWm2, designMonth } = geometry;
  const totalLoad = input.loadHourlyEnergyWh?.reduce((sum, value) => sum + value, 0);
  const gamma = input.loadHourlyEnergyWh === undefined
    ? { status: 'unavailable' as const, reasonCode: 'LOAD_PROFILE_MISSING' as const }
    : totalLoad === 0
      ? { status: 'unavailable' as const, reasonCode: 'LOAD_PROFILE_ZERO' as const }
      : { status: 'available' as const, value: calculateGamma(meanHourlyPoaWm2, input.loadHourlyEnergyWh, input.minimumOperationalIrradianceWm2), thresholdWm2: input.minimumOperationalIrradianceWm2 };
  const sourceIds = ['DATA-P1-001'];
  const trace = [
    { id: 'trace:solar-position', formulaId: 'CALC-P1-008', sourceId: 'SRC-P1-NOAA', sourceIds: ['SRC-P1-NOAA'], inputPaths: ['latitudeDeg', 'longitudeDeg', 'observations.timestampUtcIso'], outputPath: 'output.hourlyPoaWm2' },
    { id: 'trace:poa-klucher', formulaId: 'CALC-P1-009', sourceId: 'SRC-P1-PVLIB-KLUCHER', sourceIds: ['SRC-P1-PVLIB-KLUCHER'], inputPaths: ['surfaceTiltDeg', 'surfaceAzimuthDeg', 'albedo', 'observations'], outputPath: 'output.hourlyPoaWm2' },
    { id: 'trace:solar-aggregation', formulaId: 'CALC-P1-010', sourceId: sourceIds[0]!, sourceIds, inputPaths: ['hourlyPoaWm2', 'timezoneOffsetMinutes'], outputPath: 'output.monthlyAverageDailyPoaKWhM2Day' },
    { id: 'trace:gamma', formulaId: 'CALC-P1-011', sourceId: 'SRC-KSD-LEGACY-YEN', sourceIds: ['SRC-KSD-LEGACY-YEN'], inputPaths: ['meanHourlyPoaWm2', 'loadHourlyEnergyWh', 'minimumOperationalIrradianceWm2'], outputPath: 'output.gamma' },
  ];
  return {
    contractVersion: 1,
    engineVersion: '1.1.0',
    inputHash: hashTechnicalInput({ ...rest, observationsHash: geometry.observationsHash }),
    provenance: [input.provenance],
    output: {
      hourlyPoaWm2,
      monthlyAverageDailyPoaKWhM2Day,
      meanHourlyPoaWm2,
      monthlyMeanHourlyPoaWm2,
      annualPoaKWhM2: geometry.annualPoaKWhM2,
      designMonth,
      gamma,
      albedo: input.albedo,
      loadHourlyEnergyWh: input.loadHourlyEnergyWh ?? null,
      loadHourlyPeakPowerW: input.loadHourlyPeakPowerW ?? null,
    },
    warnings: [],
    issues: [],
    trace,
  };
}
