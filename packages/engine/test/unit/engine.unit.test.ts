import { describe, expect, it } from 'vitest';
import { UnsupportedCalculationError } from '../../src/index.js';

describe('unsupported production calculation', () => {
  it('fails explicitly instead of returning a simulated result', () => {
    const error = new UnsupportedCalculationError('standalone-all-in-one');
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('UnsupportedCalculationError');
    expect(error.message).toContain('standalone-all-in-one');
  });
});

