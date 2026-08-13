import { describe, expect, it } from 'vitest';
import { calculateLeadAcidNominalCapacityAh, calculateMinimumPvStcPowerW } from '../../src/index.js';

describe('non-normative legacy comparisons', () => {
  it('documents the legacy PV algebra only where the units are made explicit by AIO', () => {
    // Legacy LEG-001 used Ext/(PR*Ir) with undocumented units. AIO uses Wh/day ÷ (h/day × ratio).
    expect(calculateMinimumPvStcPowerW(3_000, 5, 0.75)).toBe(800);
  });
  it('does not preserve the legacy battery function that ignored an inverter parameter', () => {
    // LEG-002 had an unused nc argument. AIO consumes only physically declared DoD/efficiency/voltage.
    expect(calculateLeadAcidNominalCapacityAh(4_800, 48)).toBe(100);
  });
});
