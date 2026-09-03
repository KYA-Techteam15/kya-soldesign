import { describe, expect, it } from 'vitest';
import { sizeCableSegment, sizeProtectionSegment } from '../../src/index.js';

describe('protection and cabling engine', () => {
  it('selects one gPV caliber per string', () => {
    const result = sizeProtectionSegment({ segment: 'pv_inverter', moduleIscA: 8.8, moduleVocV: 38.1, pvStrings: 3, pvModulesInSeries: 5, inverterPowerW: 2400, dcVoltageV: 48, acVoltageV: 230 });
    expect(result.requiredA).toBeCloseTo(13.2); expect(result.caliberA).toBe(15); expect(result.quantity).toBe(3); expect(result.serviceVoltageV).toBeCloseTo(228.6);
  });
  it('keeps an uncovered value out of catalogue', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_load', inverterPowerW: 20_000, dcVoltageV: 48, acVoltageV: 230 });
    expect(result.exact).toBe(false); expect(result.caliberA).toBeCloseTo(108.695, 2); expect(result.options).toEqual([]);
  });
  it('falls back to the required current when an explicit type has no covering catalogue rating', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_battery', inverterPowerW: 10_000, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Fusible gG' });
    expect(result.selectedType).toBe('Fusible gG'); expect(result.options).toEqual([]); expect(result.state).toBe('estimated'); expect(result.exact).toBe(false); expect(result.caliberA).toBeCloseTo(260.4166, 2);
  });
  it('uses the retained protection caliber and voltage drop', () => {
    const result = sizeCableSegment({ segment: 'inverter_battery', currentA: 63, voltageV: 48, lengthM: 3, material: 'copper', installation: 'not_buried', phase: 'dc', maxDropPercent: 1 });
    expect(result.minimalSection).toBeGreaterThan(14); expect(result.normalizedSection).toBe(16); expect(result.dropPercent).toBeLessThanOrEqual(1);
  });
  it('requires a larger aluminium section thermally', () => {
    const copper = sizeCableSegment({ segment: 'inverter_load', currentA: 50, voltageV: 230, lengthM: 1, material: 'copper', installation: 'not_buried', phase: 'single_phase' });
    const aluminium = sizeCableSegment({ segment: 'inverter_load', currentA: 50, voltageV: 230, lengthM: 1, material: 'aluminium', installation: 'not_buried', phase: 'single_phase' });
    expect(aluminium.thermalSection).toBeGreaterThan(copper.thermalSection); expect(aluminium.normalizedSection).toBeGreaterThanOrEqual(copper.normalizedSection);
  });
});
