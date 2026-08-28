import { describe, expect, it } from 'vitest';
import { ISO_ALPHA2_COUNTRIES } from '../../src/app/models/countryReference.js';
import { countryName } from '../../src/app/models/catalogView.js';

describe('country reference', () => {
  it('contains the complete ISO alpha-2 set without duplicate identities', () => {
    expect(ISO_ALPHA2_COUNTRIES.length).toBeGreaterThanOrEqual(249);
    expect(new Set(ISO_ALPHA2_COUNTRIES).size).toBe(ISO_ALPHA2_COUNTRIES.length);
    expect(ISO_ALPHA2_COUNTRIES).toContain('TG');
    expect(ISO_ALPHA2_COUNTRIES).toContain('US');
  });

  it('localizes the same stable country code in French and English', () => {
    expect(countryName('DE', 'fr')).not.toBe('DE');
    expect(countryName('DE', 'en')).not.toBe('DE');
    expect(countryName('DE', 'fr')).not.toBe(countryName('DE', 'en'));
  });
});
