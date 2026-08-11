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
      expect(wattsToKilowatts(kilowattsToWatts(kilowatts(value)))).toBeCloseTo(value, 10);
    }));
  });

  it('round-trips finite energy values', () => {
    fc.assert(fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true }), (value) => {
      expect(wattHoursToKilowattHours(kilowattHoursToWattHours(kilowattHours(value)))).toBeCloseTo(value, 10);
    }));
  });
});

