import { describe, expect, it } from 'vitest';
import {
  formatOptionalDecimal,
  formatOptionalPercent,
  isDecimalDraft,
  parseOptionalDecimal,
  parseOptionalPercent,
  parseRequiredInteger,
} from '../../src/app/models/formValues.js';

describe('form value boundaries', () => {
  it('keeps blank optional values unknown and accepts decimal commas', () => {
    expect(parseOptionalDecimal('')).toEqual({ ok: true, value: null });
    expect(parseOptionalDecimal(' 12,5 ')).toEqual({ ok: true, value: 12.5 });
  });

  it('accepts only editable decimal drafts for coordinate fields', () => {
    for (const value of ['', '-', '10', '-10', '10,7030', '-0.1969', '.5']) {
      expect(isDecimalDraft(value), value).toBe(true);
    }
    for (const value of ['1e3', '+10', '10°', '10,2.3', 'abc', '10 2']) {
      expect(isDecimalDraft(value), value).toBe(false);
    }
  });

  it('rejects invalid and out-of-range values without numeric defaults', () => {
    expect(parseOptionalDecimal('abc')).toEqual({ ok: false, message: 'Nombre invalide' });
    expect(parseOptionalDecimal('-1', { min: 0 }).ok).toBe(false);
    expect(parseRequiredInteger('1,5').ok).toBe(false);
    expect(parseRequiredInteger('').ok).toBe(false);
  });

  it('round-trips display percentages as canonical ratios', () => {
    expect(parseOptionalPercent('37,5')).toEqual({ ok: true, value: 0.375 });
    expect(formatOptionalPercent(0.375)).toBe('37,5');
    expect(formatOptionalDecimal(null)).toBe('');
  });
});
