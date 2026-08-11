import { describe, expect, it } from 'vitest';
import { catalogs, translate } from '../../src/shared/i18n/index.js';

describe('UI localization', () => {
  it('keeps French and English catalogs complete and non-empty', () => {
    expect(Object.keys(catalogs.fr).sort()).toEqual(Object.keys(catalogs.en).sort());
    expect(Object.values(catalogs.fr).every((value) => value.trim().length > 0)).toBe(true);
    expect(Object.values(catalogs.en).every((value) => value.trim().length > 0)).toBe(true);
  });

  it('does not render raw keys', () => {
    expect(translate('fr', 'app.name')).toBe('KYA SolDesign');
    expect(() => translate('en', 'missing.key' as never)).toThrow('Missing translation');
  });
});
