import { describe, expect, it } from 'vitest';
import { canonicalJson, hashTechnicalInput } from '../../src/index.js';

describe('AIO technical input hash', () => {
  it('is stable across object key order and omits absent optional fields', () => {
    const left = { technical: { ratio: 0.8, values: [1, 2] }, missing: undefined };
    const right = { technical: { values: [1, 2], ratio: 0.8 } };
    expect(canonicalJson(left)).toBe(canonicalJson(right));
    expect(hashTechnicalInput(left)).toBe(hashTechnicalInput(right));
  });
  it('changes when technical input changes and refuses non-serializable values', () => {
    expect(hashTechnicalInput({ ratio: 0.8 })).not.toBe(hashTechnicalInput({ ratio: 0.81 }));
    expect(() => hashTechnicalInput({ invalid: Number.NaN })).toThrow();
  });
});
