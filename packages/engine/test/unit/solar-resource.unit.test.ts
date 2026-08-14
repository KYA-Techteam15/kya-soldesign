import { describe, expect, it } from 'vitest';
import { calculateSolarPositionNoaa, transposeKlucher } from '../../src/solar-resource/index.js';

describe('solar resource primitives', () => {
  it('calculates a NOAA solar position close to the pvlib SPA reference', () => {
    const result = calculateSolarPositionNoaa('2009-01-01T12:00:00.000Z', 10.703, 0.2099);
    expect(result.zenithDeg).toBeCloseTo(33.667258261, 0);
    expect(result.azimuthDeg).toBeCloseTo(178.826590615, 0);
  });

  it('implements the Klucher direct, sky and ground components', () => {
    const result = transposeKlucher({
      surfaceTiltDeg: 15,
      surfaceAzimuthDeg: 180,
      solarZenithDeg: 30,
      solarAzimuthDeg: 180,
      dniWm2: 700,
      ghiWm2: 800,
      dhiWm2: 150,
      albedo: 0.2,
    });
    expect(result.directWm2).toBeCloseTo(676.1480784023478, 9);
    expect(result.skyDiffuseWm2).toBeCloseTo(164.38779000034035, 9);
    expect(result.groundDiffuseWm2).toBeCloseTo(2.725933896874535, 9);
    expect(result.globalWm2).toBeCloseTo(843.2618022995626, 9);
  });
});
