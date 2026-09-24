const HOURS_PER_DAY = 24;

export function defaultOperatingFractions(durationHours: number, startHour = 8): number[] {
  assertDuration(durationHours);
  const selected = Array.from(
    { length: Math.ceil(durationHours) },
    (_, index) => (normalizeHour(startHour) + index) % HOURS_PER_DAY,
  );
  return operatingFractionsForSelectedHours(durationHours, selected);
}

export function reconcileOperatingFractions(
  durationHours: number,
  currentFractions: readonly number[],
): number[] {
  assertDuration(durationHours);
  const activeHours = currentFractions
    .flatMap((value, hour) => Number.isFinite(value) && value > 0 ? [hour] : []);
  return activeHours.length === Math.ceil(durationHours)
    ? operatingFractionsForSelectedHours(durationHours, activeHours)
    : defaultOperatingFractions(durationHours);
}

/**
 * Nouvelle durée d'usage, horaires conservés : seul le dernier bloc s'allonge ou se raccourcit.
 * Un appareil qui tourne 06–08 et 18–20 et passe de 4 à 5 h tourne 06–08 et 18–21 ; les heures
 * choisies ailleurs ne bougent pas. Sans horaire, la plage par défaut s'applique.
 */
export function resizeOperatingSchedule(durationHours: number, currentFractions: readonly number[]): number[] {
  assertDuration(durationHours);
  const required = Math.ceil(durationHours);
  const selected = new Set(currentFractions.flatMap((value, hour) => Number.isFinite(value) && value > 0 ? [hour] : []));
  if (selected.size === 0) return defaultOperatingFractions(durationHours);
  while (selected.size < required) {
    let hour = (lastBlockEnd(selected) + 1) % HOURS_PER_DAY;
    while (selected.has(hour)) hour = (hour + 1) % HOURS_PER_DAY;
    selected.add(hour);
  }
  while (selected.size > required) selected.delete(lastBlockEnd(selected));
  return operatingFractionsForSelectedHours(durationHours, [...selected]);
}

/** Dernière heure du bloc qui commence le plus tard dans la journée (un bloc peut franchir minuit). */
function lastBlockEnd(selected: ReadonlySet<number>): number {
  const starts = [...selected].filter((hour) => !selected.has((hour + HOURS_PER_DAY - 1) % HOURS_PER_DAY));
  // 24 h sur 24 : aucun début de bloc ; la journée se termine à 23 h.
  if (starts.length === 0) return HOURS_PER_DAY - 1;
  // Le bloc est borné par une heure libre (sinon il n'aurait pas de début) : la marche s'arrête.
  let hour = Math.max(...starts);
  while (selected.has((hour + 1) % HOURS_PER_DAY)) hour = (hour + 1) % HOURS_PER_DAY;
  return hour;
}

export function operatingFractionsForSelectedHours(
  durationHours: number,
  selectedHours: readonly number[],
): number[] {
  assertDuration(durationHours);
  const required = Math.ceil(durationHours);
  const unique = [...new Set(selectedHours)].sort((left, right) => left - right);
  if (unique.length !== required || unique.some((hour) => !Number.isInteger(hour) || hour < 0 || hour >= HOURS_PER_DAY)) {
    throw new RangeError(`duration ${durationHours} requires exactly ${required} distinct hours in [0, 23]`);
  }
  const result = Array.from({ length: HOURS_PER_DAY }, () => 0);
  const fractional = durationHours - Math.floor(durationHours);
  unique.forEach((hour, index) => {
    result[hour] = fractional > 0 && index === unique.length - 1 ? fractional : 1;
  });
  return result;
}

function assertDuration(durationHours: number): void {
  if (!Number.isFinite(durationHours) || durationHours < 0 || durationHours > HOURS_PER_DAY) {
    throw new RangeError('durationHours must be finite and between 0 and 24');
  }
}

function normalizeHour(hour: number): number {
  if (!Number.isInteger(hour)) throw new RangeError('startHour must be an integer');
  return ((hour % HOURS_PER_DAY) + HOURS_PER_DAY) % HOURS_PER_DAY;
}
