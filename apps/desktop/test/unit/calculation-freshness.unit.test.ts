import { describe, expect, it } from 'vitest';
import { invalidateDownstream, isCalculationFresh, type CalculationFingerprint } from '../../src/app/models/calculationFreshness.js';

const calculations: readonly CalculationFingerprint[] = [
  { stage: 'presizing', inputHash: 'pre', status: 'valid' },
  { stage: 'sizing', inputHash: 'size', status: 'valid' },
  { stage: 'protections', inputHash: 'protect', status: 'valid' },
  { stage: 'cables', inputHash: 'cable', status: 'valid' },
];

describe('calculation freshness cascade', () => {
  it('invalidates every result downstream from detailed sizing', () => {
    const next = invalidateDownstream(calculations, 'sizing', 'EQUIPMENT_CHANGED');
    expect(next.map(({ stage, status }) => [stage, status])).toEqual([
      ['presizing', 'valid'],
      ['sizing', 'valid'],
      ['protections', 'stale'],
      ['cables', 'stale'],
    ]);
  });

  it('requires both a valid state and the current input hash', () => {
    expect(isCalculationFresh(calculations[1], 'size')).toBe(true);
    expect(isCalculationFresh(calculations[1], 'changed')).toBe(false);
  });
});
