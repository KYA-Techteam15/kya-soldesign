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
