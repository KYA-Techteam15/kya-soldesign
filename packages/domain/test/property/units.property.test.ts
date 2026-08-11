import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  kilowattHours,
  kilowattHoursToWattHours,
  kilowatts,
  kilowattsToWatts,
  wattHoursToKilowattHours,
  wattsToKilowatts,
} from '../../src/index.js';

describe('unit conversion properties', () => {
  it('round-trips finite power values', () => {
    fc.assert(fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (value) => {
      expectRoundTrip(value, wattsToKilowatts(kilowattsToWatts(kilowatts(value))));
    }));
  });

  it('round-trips finite energy values', () => {
    fc.assert(fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (value) => {
      expectRoundTrip(value, wattHoursToKilowattHours(kilowattHoursToWattHours(kilowattHours(value))));
    }));
  });
});

function expectRoundTrip(expected: number, actual: number): void {
  const tolerance = Number.EPSILON * Math.max(1, Math.abs(expected)) * 2;
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(tolerance);
}
