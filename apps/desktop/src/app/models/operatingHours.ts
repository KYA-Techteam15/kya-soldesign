import { operatingFractionsForSelectedHours } from '@ksd/engine';

/**
 * Horaires d'un appareil : les heures de la journée où il fonctionne.
 *
 * Les heures s'écrivent 00–23, sans nom de moment de la journée : « soirée » ou « nuit » ne
 * désignent pas les mêmes heures d'un pays à l'autre. Les modèles portent donc leurs plages.
 */

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export function selectedHours(fractions: readonly number[]): number[] {
  return fractions.flatMap((value, hour) => Number.isFinite(value) && value > 0 ? [hour] : []);
}

/** Blocs d'heures consécutives, un bloc pouvant franchir minuit ; `end` exclu. */
export function hourBlocks(hours: readonly number[]): { readonly start: number; readonly end: number }[] {
  const set = new Set(hours);
  if (set.size === 0) return [];
  if (set.size === 24) return [{ start: 0, end: 24 }];
  const starts = [...set].filter((hour) => !set.has((hour + 23) % 24)).sort((left, right) => left - right);
  return starts.map((start) => {
    let length = 1;
    while (set.has((start + length) % 24)) length += 1;
    return { start, end: start + length };
  });
}

const pad = (hour: number) => String(hour % 24 === 0 && hour > 0 ? 24 : hour % 24).padStart(2, '0');

/** « 06–08 · 18–21 », « 22–06 », « 00–24 » ; chaîne vide si aucune heure. */
export function formatHourBlocks(hours: readonly number[]): string {
  return hourBlocks(hours).map(({ start, end }) => `${pad(start)}–${end >= 24 && end !== 24 ? pad(end - 24) : pad(end)}`).join(' · ');
}

export interface HourPreset {
  readonly id: string;
  readonly hours: readonly number[];
}

const range = (start: number, end: number) => Array.from({ length: (end - start + 24) % 24 || 24 }, (_, index) => (start + index) % 24);

/** Modèles d'horaire, nommés par leurs plages. */
export const HOUR_PRESETS: readonly HourPreset[] = [
  { id: '08-16', hours: range(8, 16) },
  { id: '08-12+14-18', hours: [...range(8, 12), ...range(14, 18)] },
  { id: '18-24', hours: range(18, 24) },
  { id: '22-06', hours: range(22, 6) },
  { id: '00-24', hours: range(0, 24) },
];

/**
 * Horaire peint par l'utilisateur. Si le nombre d'heures peintes correspond à la durée saisie
 * (fraction comprise : 4,5 h = 5 heures dont la dernière à moitié), la durée est conservée ;
 * sinon la durée devient le nombre d'heures peintes : le dessin fait foi.
 */
export function scheduleFromHours(durationHours: number, hours: readonly number[]): { readonly durationHours: number; readonly fractions: number[] } {
  const unique = [...new Set(hours)];
  const duration = unique.length === Math.ceil(durationHours) ? durationHours : unique.length;
  return { durationHours: duration, fractions: operatingFractionsForSelectedHours(duration, unique) };
}
