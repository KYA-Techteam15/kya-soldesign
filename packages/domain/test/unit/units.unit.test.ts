import { describe, expect, it } from 'vitest';
import {
  amperes,
  hours,
  kilowattHours,
  kilowattHoursToWattHours,
  kilowatts,
  kilowattsToWatts,
  volts,
  wattHours,
  wattHoursToKilowattHours,
  watts,
  wattsToKilowatts,
} from '../../src/index.js';

describe('canonical unit conversions', () => {
  it('converts power in both directions', () => {
    expect(kilowattsToWatts(kilowatts(1.25))).toBe(1_250);
    expect(wattsToKilowatts(kilowattsToWatts(kilowatts(1.25)))).toBe(1.25);
  });

  it('converts energy in both directions', () => {
    expect(kilowattHoursToWattHours(kilowattHours(3.2))).toBe(3_200);
    expect(wattHoursToKilowattHours(kilowattHoursToWattHours(kilowattHours(3.2)))).toBe(3.2);
  });

  it('rejects non-finite quantities', () => {
    expect(() => kilowatts(Number.NaN)).toThrow(RangeError);
  });

  it('constructs finite canonical quantities without changing values', () => {
    expect(watts(250)).toBe(250);
    expect(wattHours(750)).toBe(750);
    expect(volts(48)).toBe(48);
    expect(amperes(12.5)).toBe(12.5);
    expect(hours(6)).toBe(6);
  });
});

