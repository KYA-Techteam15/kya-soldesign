import { describe, expect, it } from 'vitest';
import {
  deriveDailyLoadEnergyWh,
  loadItemSchema,
  normalizedHourlyProfileSchema,
  normalizeHourlyEnergyWeights,
} from '../../src/index.js';

describe('load contracts', () => {
  it('derives daily energy from one schedule source of truth', () => {
    const load = loadItemSchema.parse({
      id: 'fan',
      label: 'Fan',
      quantity: 2,
      activePowerW: 50,
      powerFactor: null,
      simultaneityRatio: 0.5,
      hourlyOperatingFractions: Array.from({ length: 24 }, (_, index) => index < 8 ? 1 : 0),
    });
    expect(deriveDailyLoadEnergyWh(load)).toBe(400);
  });

  it('normalizes legacy weights deterministically', () => {
    const fractions = normalizeHourlyEnergyWeights(Array.from({ length: 24 }, () => 1));
    expect(fractions.reduce((total, fraction) => total + fraction, 0)).toBeCloseTo(1, 12);
    expect(normalizedHourlyProfileSchema.parse({
      id: 'flat',
      displayName: 'Flat',
      hourlyEnergyFractions: fractions,
      provenance: {
        sourceId: 'fixture:test',
        sourceRecordId: 'flat',
        sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        transformationVersion: '1.0.0',
      },
    }).id).toBe('flat');
  });

  it('rejects non-normalized energy profiles', () => {
    expect(() => normalizedHourlyProfileSchema.parse({
      id: 'invalid',
      displayName: 'Invalid',
      hourlyEnergyFractions: Array.from({ length: 24 }, () => 0.1),
      provenance: {
        sourceId: 'fixture:test',
        sourceRecordId: 'invalid',
        sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        transformationVersion: '1.0.0',
      },
    })).toThrow();
  });
});
