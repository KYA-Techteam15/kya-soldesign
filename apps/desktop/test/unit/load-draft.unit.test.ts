import { describe, expect, it } from 'vitest';
import { parseLoadDraft } from '../../src/features/workshop/steps/loadDraft.js';

describe('load draft boundary', () => {
  it('creates a canonical load only from explicit valid inputs', () => {
    const result = parseLoadDraft({
      id: 'load-lighting',
      label: 'Éclairage atelier',
      quantity: '4',
      activePowerW: '18',
      powerFactor: '',
      simultaneityRatio: '0.75',
      activeHours: [18, 19, 20, 21],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.item.quantity).toBe(4);
      expect(result.item.powerFactor).toBeNull();
      expect(result.item.hourlyOperatingFractions.filter((value) => value === 1)).toHaveLength(4);
    }
  });

  it('rejects missing, fractional, and out-of-range values without defaults', () => {
    const result = parseLoadDraft({
      id: 'load-invalid', label: '', quantity: '1.5', activePowerW: '-1', powerFactor: '1.2', simultaneityRatio: '', activeHours: [],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toMatchObject({ label: expect.any(String), quantity: expect.any(String), activePowerW: expect.any(String), simultaneityRatio: expect.any(String) });
  });
});
