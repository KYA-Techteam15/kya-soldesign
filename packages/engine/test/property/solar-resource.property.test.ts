import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { calculateGamma, transposeKlucher } from '../../src/solar-resource/index.js';

describe('solar resource properties', () => {
  it('keeps every Klucher component finite and non-negative', () => {
    fc.assert(fc.property(
      fc.double({ min: 0, max: 90, noNaN: true }), fc.double({ min: 0, max: 359.999, noNaN: true }),
      fc.double({ min: 0, max: 180, noNaN: true }), fc.double({ min: 0, max: 359.999, noNaN: true }),
      fc.double({ min: 0, max: 1_500, noNaN: true }), fc.double({ min: 0, max: 1_500, noNaN: true }),
      fc.double({ min: 0, max: 1_500, noNaN: true }), fc.double({ min: 0, max: 1, noNaN: true }),
      (surfaceTiltDeg, surfaceAzimuthDeg, solarZenithDeg, solarAzimuthDeg, dniWm2, ghiWm2, dhiWm2, albedo) => {
        const output = transposeKlucher({ surfaceTiltDeg, surfaceAzimuthDeg, solarZenithDeg, solarAzimuthDeg, dniWm2, ghiWm2, dhiWm2, albedo });
        expect(Object.values(output).every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
        expect(output.globalWm2).toBeCloseTo(output.directWm2 + output.skyDiffuseWm2 + output.groundDiffuseWm2, 8);
      },
    ));
  });

  it('keeps gamma in [0,1] and invariant when load is scaled', () => {
    fc.assert(fc.property(
      fc.array(fc.double({ min: 0, max: 2_000, noNaN: true }), { minLength: 24, maxLength: 24 }),
      fc.array(fc.double({ min: 0.001, max: 100_000, noNaN: true }), { minLength: 24, maxLength: 24 }),
      fc.double({ min: 0.001, max: 100, noNaN: true }),
      (irradiance, load, scale) => {
        const first = calculateGamma(irradiance, load, 10);
        const scaled = calculateGamma(irradiance, load.map((value) => value * scale), 10);
        expect(first).toBeGreaterThanOrEqual(0);
        expect(first).toBeLessThanOrEqual(1);
        expect(scaled).toBeCloseTo(first, 10);
      },
    ));
  });
});
