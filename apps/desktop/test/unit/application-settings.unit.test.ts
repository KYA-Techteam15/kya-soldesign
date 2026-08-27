import { describe, expect, it } from 'vitest';
import { createEmptyProjectFile } from '../../src/app/models/projectAdapters.js';
import { applyProjectDefaults } from '../../src/app/services/createProject.js';
import { defaultApplicationSettings, migrateApplicationSettings, validateApplicationSettings } from '../../src/app/models/applicationSettings.js';

describe('application settings V2', () => {
  it('migrates the existing flat settings and ignores global depth of discharge', () => {
    const result = migrateApplicationSettings({ companyName: 'Test', batteryDodPercent: 55, batteryVoltage: 48, performanceRatioPercent: 82, currencyCode: 'XOF' });
    expect(result.settings.version).toBe(2);
    expect(result.settings.company.name).toBe('Test');
    expect(result.settings.defaults.reliability.performanceRatioPercent).toBe(82);
    expect(result.ignoredKeys).toContain('batteryDodPercent');
    expect(result.ignoredKeys).toContain('batteryVoltage');
    expect(result.settings).not.toHaveProperty('batteryDodPercent');
    expect(result.settings.defaults.conversion).not.toHaveProperty('batteryNominalVoltageV');
  });

  it('rejects invalid defaults instead of normalizing them to zero', () => {
    expect(() => validateApplicationSettings({ ...defaultApplicationSettings, defaults: { ...defaultApplicationSettings.defaults, reliability: { ...defaultApplicationSettings.defaults.reliability, performanceRatioPercent: 101 } } })).toThrow('SETTINGS_INVALID_performanceRatioPercent');
  });

  it('applies settings only to the new project and keeps battery Dod in the project model', () => {
    const project = createEmptyProjectFile('00000000-0000-4000-8000-000000000010', 'standalone-all-in-one', '2026-08-27T00:00:00.000Z', 'Test');
    const settings = { ...defaultApplicationSettings, defaults: { ...defaultApplicationSettings.defaults, reliability: { ...defaultApplicationSettings.defaults.reliability, performanceRatioPercent: 83 } } };
    const result = applyProjectDefaults(project, settings);
    expect(result.inputs.assumptions.systemPerformanceRatio).toBeCloseTo(0.83);
    expect(result.inputs.assumptions.batteryDodRatio).toBeDefined();
    expect(settings).not.toHaveProperty('batteryDod');
  });
});
