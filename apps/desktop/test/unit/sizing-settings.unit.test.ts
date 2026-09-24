import { describe, expect, it } from 'vitest';
import { defaultApplicationSettings, mergeSettings, validateApplicationSettings } from '../../src/app/models/applicationSettings.js';

describe('sizing settings (spec 011, FR-027 / FR-028)', () => {
  it('starts with empty references, a cap of 10 modules and batteries, no inverter cap and 5 proposals', () => {
    expect(defaultApplicationSettings.sizing).toEqual({ favorites: { module: [], battery: [], inverter: [] }, caps: { module: 10, battery: 10, inverter: null }, proposals: 5 });
  });

  it('keeps the defaults when an older settings file has no sizing section', () => {
    const legacy = { ...defaultApplicationSettings } as Record<string, unknown>;
    delete legacy.sizing;
    expect(validateApplicationSettings(legacy).sizing.caps.module).toBe(10);
  });

  it('merges a partial update without losing the other families', () => {
    const merged = mergeSettings(defaultApplicationSettings, { sizing: { favorites: { module: ['m1'] }, caps: { inverter: 20 } } });
    expect(merged.sizing.favorites).toEqual({ module: ['m1'], battery: [], inverter: [] });
    expect(merged.sizing.caps).toEqual({ module: 10, battery: 10, inverter: 20 });
  });

  it('rejects caps and proposal counts out of range', () => {
    expect(() => validateApplicationSettings({ ...defaultApplicationSettings, sizing: { ...defaultApplicationSettings.sizing, caps: { module: 0, battery: 10, inverter: null } } })).toThrow('SETTINGS_INVALID_capModule');
    expect(() => validateApplicationSettings({ ...defaultApplicationSettings, sizing: { ...defaultApplicationSettings.sizing, proposals: 11 } })).toThrow('SETTINGS_INVALID_proposals');
    expect(() => validateApplicationSettings({ ...defaultApplicationSettings, sizing: { ...defaultApplicationSettings.sizing, caps: { module: 10, battery: 10, inverter: 2.5 } } })).toThrow('SETTINGS_INVALID_capInverter');
  });
});
