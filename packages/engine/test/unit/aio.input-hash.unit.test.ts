import { describe, expect, it } from 'vitest';
import { canonicalJson, hashDiagnosticInput, hashTechnicalInput } from '../../src/index.js';

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
  it('creates a stable, explicit diagnostic identity for non-canonical values', () => {
    const invalid = { nan: Number.NaN, positive: Infinity, negative: -Infinity, missing: undefined };
    expect(hashDiagnosticInput(invalid)).toBe(hashDiagnosticInput({ ...invalid }));
    expect(hashDiagnosticInput(invalid)).toMatch(/^diagnostic-fnv1a64:/);
    expect(hashDiagnosticInput({ nan: Number.NaN })).not.toBe(hashDiagnosticInput({ nan: 0 }));
  });
  it('does not throw for circular or otherwise non-JSON diagnostic payloads', () => {
    const circular: Record<string, unknown> = { callback: function invalidCallback() { return undefined; } };
    circular['self'] = circular;
    expect(() => hashDiagnosticInput(circular)).not.toThrow();
    expect(hashDiagnosticInput(circular)).toBe(hashDiagnosticInput(circular));
  });
});
