import { normalizeDirectHourlyPowerToAioDailyLoad, type StartupEventV1 } from '@ksd/domain';
import type { LoadInputIssue, Page1LoadNormalization } from './contracts.js';

export function normalizeDirectHourlyRows(input: {
  readonly timezoneIana: string;
  readonly hourlyPowerW: readonly number[];
  readonly hourlyPeakPowerW: readonly (number | null)[];
}): Page1LoadNormalization {
  const issues: LoadInputIssue[] = [];
  // Une journée type (24) ou une année complète (8 760). Les deux séries
  // doivent avoir la même longueur : une pointe sans sa puissance moyenne, ou
  // l'inverse, décrirait deux profils différents sous un seul nom.
  const hours = input.hourlyPowerW.length;
  if (hours !== 24 && hours !== 8760) issues.push(issue('LOAD_DIRECT_LENGTH_INVALID', 'hourlyPowerW', 'Exactly 24 or 8760 hourly powers are required'));
  if (input.hourlyPeakPowerW.length !== hours) issues.push(issue('LOAD_DIRECT_PEAK_LENGTH_INVALID', 'hourlyPeakPowerW', 'Hourly peaks must match the hourly power count'));
  input.hourlyPowerW.forEach((value, hour) => {
    if (!Number.isFinite(value) || value < 0) issues.push(issue('LOAD_DIRECT_POWER_INVALID', `hourlyPowerW.${hour}`, 'Hourly power must be finite and non-negative'));
    const peak = input.hourlyPeakPowerW[hour];
    if (peak !== null && peak !== undefined && (!Number.isFinite(peak) || peak < value)) issues.push(issue('LOAD_DIRECT_PEAK_INVALID', `hourlyPeakPowerW.${hour}`, 'Hourly peak must be greater than or equal to average power'));
  });
  if (issues.length > 0) return { status: 'blocked', issues };

  const hasUnmodeledPeak = input.hourlyPeakPowerW.some((peak, hour) => peak !== null && peak > input.hourlyPowerW[hour]!);
  const startupEvents: StartupEventV1[] = hasUnmodeledPeak ? [{
    hourIndex: input.hourlyPeakPowerW.findIndex((peak, hour) => peak !== null && peak > input.hourlyPowerW[hour]!),
    runningPowerW: 1,
    startupPowerMultiplier: null,
    isInductive: true,
    sourceRef: 'direct-hourly-peak-unmodeled',
  }] : [];
  try {
    return {
      status: 'ready',
      load: normalizeDirectHourlyPowerToAioDailyLoad({ timezoneIana: input.timezoneIana, hourlyPowerW: designDay(input.hourlyPowerW), startupEvents }),
      warnings: [
        ...(hasUnmodeledPeak ? [{ code: 'LOAD_DIRECT_TRANSIENT_UNMODELED', message: 'Direct transient peaks are recorded but AIO v1 cannot consume their magnitude; surge output is blocked' }] : []),
        ...(hours === 8760 ? [{ code: 'LOAD_DIRECT_ANNUAL_REDUCED_TO_DESIGN_DAY', message: 'AIO v1 sizes on a single day: the annual series was reduced to its heaviest day. Reliability metrics still use the full year.' }] : []),
      ],
    };
  } catch (error) {
    return { status: 'blocked', issues: [issue('LOAD_DIRECT_INVALID', 'hourlyPowerW', error instanceof Error ? error.message : 'Invalid direct profile')] };
  }
}

/**
 * Rang horaire du premier point du jour le plus chargé.
 *
 * Exporté parce que plusieurs séries décrivent la même journée — les puissances
 * moyennes et les puissances de pointe — et qu'elles doivent impérativement
 * désigner le même jour. Deux règles séparées auraient collé les pointes d'août
 * sur les moyennes de février, sans que rien ne le signale.
 *
 * Renvoie 0 pour une journée type, qui est déjà son propre jour dimensionnant.
 */
export function designDayStartIndex(hourlyPowerW: readonly number[]): number {
  if (hourlyPowerW.length <= 24) return 0;
  let bestStart = 0;
  let bestEnergy = -1;
  for (let start = 0; start + 24 <= hourlyPowerW.length; start += 24) {
    let energy = 0;
    for (let hour = 0; hour < 24; hour += 1) energy += hourlyPowerW[start + hour]!;
    if (energy > bestEnergy) { bestEnergy = energy; bestStart = start; }
  }
  return bestStart;
}

/**
 * Journée de dimensionnement d'une série annuelle.
 *
 * Le contrat AIO v1 raisonne sur une journée. Prendre la moyenne des 365 jours
 * aurait sous-dimensionné le système exactement les jours qui comptent : on
 * retient la journée la plus consommatrice, celle qui doit passer.
 */
function designDay(hourlyPowerW: readonly number[]): readonly number[] {
  if (hourlyPowerW.length === 24) return hourlyPowerW;
  const bestStart = designDayStartIndex(hourlyPowerW);
  return hourlyPowerW.slice(bestStart, bestStart + 24);
}

function issue(code: string, path: string, message: string): LoadInputIssue {
  return { code, path, message };
}
