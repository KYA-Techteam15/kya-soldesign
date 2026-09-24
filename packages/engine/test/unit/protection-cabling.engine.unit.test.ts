import { describe, expect, it } from 'vitest';
import { ampacityA, BATTERY_CUTOFF_VOLTAGE_RATIO, cableDesignCurrent, sizeCableSegment, sizeProtectionSegment, temperatureCorrectionFactor } from '../../src/index.js';

describe('protections (core v2)', () => {
  it('retains the smallest standard gPV rating by default, and an explicit choice over it', () => {
    const common = { segment: 'pv_inverter', moduleIscA: 8.8, moduleVocV: 38.1, pvStrings: 3, pvModulesInSeries: 5, inverterPowerW: 2400, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Fusible gPV' } as const;
    const suggested = sizeProtectionSegment(common);
    expect(suggested.requiredA).toBeCloseTo(13.2);
    expect(suggested.recommendedRatingA).toBe(15);
    expect(suggested).toMatchObject({ caliberA: 15, state: 'valid', overridden: false, followsSuggestion: false, quantity: 3 });
    const chosen = sizeProtectionSegment({ ...common, selectedCaliberA: 20 });
    expect(chosen).toMatchObject({ caliberA: 20, state: 'valid', overridden: true });
  });

  it('follows the recommended type and rating when nothing is chosen', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_load', inverterPowerW: 3000, dcVoltageV: 48, acVoltageV: 230 });
    expect(result).toMatchObject({ kind: 'Disjoncteur AC', selectedType: null, state: 'valid', followsSuggestion: true });
    expect(result.caliberA).toBe(result.recommendedRatingA);
    expect(result.options.length).toBeGreaterThan(0);
  });

  it('flags an explicit rating that no longer covers the current instead of replacing it', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_load', inverterPowerW: 3000, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Disjoncteur AC', selectedCaliberA: 10 });
    expect(result).toMatchObject({ state: 'awaiting-rating', caliberA: null, overridden: false });
  });

  it('uses the cold string voltage when the sizing provides it', () => {
    const result = sizeProtectionSegment({ segment: 'pv_inverter', moduleIscA: 10, moduleVocV: 40, pvModulesInSeries: 7, stringVocColdV: 301.5, inverterPowerW: 3000, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Fusible gPV' });
    expect(result.serviceVoltageV).toBe(301.5);
  });

  it('sizes the battery side at the cut-off voltage and through the inverter efficiency', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_battery', inverterPowerW: 5000, dcVoltageV: 48, acVoltageV: 230, inverterEfficiencyRatio: 0.95, selectedType: 'Disjoncteur DC' });
    expect(result.requiredA).toBeCloseTo(1.25 * 5000 / (0.95 * 48 * BATTERY_CUTOFF_VOLTAGE_RATIO), 6);
    expect(result.requiredA).toBeGreaterThan(1.25 * 5000 / 48);
    expect(result.recommendedRatingA).toBe(160);
  });

  it('covers AC currents above 63 A with standard ratings only', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_load', inverterPowerW: 20_000, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Disjoncteur AC', selectedCaliberA: 125 });
    expect(result.requiredA).toBeCloseTo(108.695, 2);
    expect(result.options[0]).toBe(125);
    expect(result.state).toBe('valid');
  });

  it('reports out-of-range instead of inventing a non-standard rating', () => {
    const result = sizeProtectionSegment({ segment: 'inverter_load', inverterPowerW: 150_000, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Disjoncteur AC' });
    expect(result.state).toBe('out-of-range');
    expect(result.caliberA).toBeNull();
  });

  it('is unavailable while no current can be derived', () => {
    expect(sizeProtectionSegment({ segment: 'inverter_battery', inverterPowerW: 0, dcVoltageV: 0, acVoltageV: 230, selectedType: 'Fusible gG' }).state).toBe('unavailable');
  });
});

describe('cables (IEC 60364-5-52)', () => {
  it('reads the reference tables', () => {
    expect(ampacityA('copper', 'C', 16)).toBe(85);
    expect(ampacityA('copper', 'D1', 16)).toBe(78);
    expect(ampacityA('aluminium', 'C', 1.5)).toBeNull();
    expect(temperatureCorrectionFactor('C', 30)).toBe(1);
    expect(temperatureCorrectionFactor('C', 38)).toBe(0.87);
    expect(temperatureCorrectionFactor('D1', 20)).toBe(1);
    expect(temperatureCorrectionFactor('C', 75)).toBeNull();
  });

  it('keeps the voltage-drop section when it governs', () => {
    const result = sizeCableSegment({ segment: 'inverter_battery', currentA: 63, voltageV: 48, lengthM: 3, material: 'copper', installation: 'not_buried', phase: 'dc', maxDropPercent: 1 });
    expect(result.normalizedSection).toBe(16);
    expect(result.governingConstraint).toBe('voltage-drop');
    expect(result.dropPercent).toBeLessThanOrEqual(1);
  });

  it('changes with the installation method and the site temperature', () => {
    const base = { segment: 'inverter_load', currentA: 80, voltageV: 230, lengthM: 1, material: 'copper', phase: 'single_phase' } as const;
    const clipped = sizeCableSegment({ ...base, installation: 'not_buried' });
    const buried = sizeCableSegment({ ...base, installation: 'buried' });
    const hot = sizeCableSegment({ ...base, installation: 'not_buried', ambientTemperatureC: 44 });
    expect(clipped.thermalSection).toBe(16);
    expect(buried.thermalSection).toBe(25);
    expect(hot.thermalSection).toBe(25);
    expect(clipped.temperatureAssumed).toBe(true);
    expect(hot.temperatureAssumed).toBe(false);
    expect(hot.correctionFactor).toBe(0.79);
  });

  it('requires a larger aluminium section thermally', () => {
    const copper = sizeCableSegment({ segment: 'inverter_load', currentA: 50, voltageV: 230, lengthM: 1, material: 'copper', installation: 'not_buried', phase: 'single_phase' });
    const aluminium = sizeCableSegment({ segment: 'inverter_load', currentA: 50, voltageV: 230, lengthM: 1, material: 'aluminium', installation: 'not_buried', phase: 'single_phase' });
    expect(aluminium.thermalSection).toBeGreaterThan(copper.thermalSection);
  });

  it('sizes the cable on the suggested rating while the chosen one is invalid, and says so', () => {
    // Calibre choisi devenu insuffisant : le câble est dimensionné sur la suggestion, à titre provisoire.
    const protection = sizeProtectionSegment({ segment: 'pv_inverter', moduleIscA: 8.8, moduleVocV: 38.1, pvStrings: 3, pvModulesInSeries: 5, inverterPowerW: 2400, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Fusible gPV', selectedCaliberA: 10 });
    const suggested = cableDesignCurrent(protection);
    expect(suggested).toEqual({ currentA: 15, basis: 'suggested-rating' });
    const provisional = sizeCableSegment({ segment: 'pv_inverter', currentA: suggested.currentA, currentBasis: suggested.basis, voltageV: 300, lengthM: 10, material: 'copper', installation: 'not_buried', phase: 'dc' });
    expect(provisional).toMatchObject({ state: 'valid', provisional: true, currentBasis: 'suggested-rating' });
    expect(provisional.normalizedSection).toBeGreaterThan(0);

    const chosen = sizeProtectionSegment({ segment: 'pv_inverter', moduleIscA: 8.8, moduleVocV: 38.1, pvStrings: 3, pvModulesInSeries: 5, inverterPowerW: 2400, dcVoltageV: 48, acVoltageV: 230, selectedType: 'Fusible gPV', selectedCaliberA: 20 });
    expect(cableDesignCurrent(chosen)).toEqual({ currentA: 20, basis: 'selected-rating' });
    expect(sizeCableSegment({ segment: 'pv_inverter', currentA: 20, voltageV: 300, lengthM: 10, material: 'copper', installation: 'not_buried', phase: 'dc' }).provisional).toBe(false);
  });

  it('falls back on the required current when no standard rating covers it', () => {
    expect(cableDesignCurrent({ caliberA: null, recommendedRatingA: null, requiredA: 900 })).toEqual({ currentA: 900, basis: 'design-current' });
  });
  it('is blocked without a protection rating', () => {
    expect(sizeCableSegment({ segment: 'pv_inverter', currentA: 0, voltageV: 300, lengthM: 10, material: 'copper', installation: 'not_buried', phase: 'dc' }).issues).toContain('CURRENT_MISSING');
  });
});
