import { describe, expect, it } from 'vitest';
import { exportEquipmentWorkbook, exportHourlyProfileWorkbook, inspectEquipmentWorkbook, inspectHourlyProfileWorkbook } from '../../src/app/services/loadWorkbooks.js';

describe('load workbooks', () => {
  it('round-trips one equipment sheet without a simultaneity column and defaults empty hours', () => {
    const workbook = exportEquipmentWorkbook([{
      id: 'pump', label: 'Pompe', quantity: 2, usefulPowerW: 500, efficiencyRatio: 0.8,
      startupPowerMultiplier: 3, durationHours: 4, hourlyOperatingFractions: Array(24).fill(null),
    }]);
    const result = inspectEquipmentWorkbook(workbook);
    expect(result.status).toBe('valid');
    if (result.status === 'valid') {
      expect(result.candidate[0]?.hourlyOperatingFractions.filter((value) => value > 0)).toHaveLength(4);
      expect(result.warnings[0]?.code).toBe('HOURS_DEFAULTED');
    }
  });

  it('reports the exact cells that block an equipment import', () => {
    const workbook = exportEquipmentWorkbook([{
      id: 'pump', label: 'Pompe', quantity: 2, usefulPowerW: 500, efficiencyRatio: 0.8,
      startupPowerMultiplier: 3, durationHours: 4, hourlyOperatingFractions: Array.from({ length: 24 }, () => 0),
    }]);
    const sheet = inspectEquipmentWorkbook(workbook);
    expect(sheet.status).toBe('valid');
    const invalid = exportEquipmentWorkbook([{
      id: 'pump', label: 'Pompe', quantity: 0, usefulPowerW: 500, efficiencyRatio: 1.2,
      startupPowerMultiplier: 1, durationHours: 4, hourlyOperatingFractions: Array.from({ length: 24 }, (_, hour) => hour === 2 ? 2 : 0),
    }]);
    const result = inspectEquipmentWorkbook(invalid);
    expect(result.status).toBe('invalid');
    if (result.status === 'invalid') expect(result.issues.map((issue) => issue.code)).toEqual(expect.arrayContaining(['RANGE_INVALID']));
  });

  it('round-trips a three-column hourly profile and rejects a peak below average', () => {
    const workbook = exportHourlyProfileWorkbook(Array.from({ length: 24 }, (_, hour) => ({ hourIndex: hour, activePowerKw: 1, peakPowerKw: 2 })));
    const result = inspectHourlyProfileWorkbook(workbook);
    expect(result.status).toBe('valid');
    const invalid = exportHourlyProfileWorkbook(Array.from({ length: 24 }, (_, hour) => ({ hourIndex: hour, activePowerKw: 2, peakPowerKw: 1 })));
    expect(inspectHourlyProfileWorkbook(invalid).status).toBe('invalid');
  });
});

describe('série horaire annuelle', () => {
  it('accepte un classeur de 8 760 heures', () => {
    const workbook = exportHourlyProfileWorkbook(
      Array.from({ length: 8_760 }, (_, hour) => ({ hourIndex: hour, activePowerKw: 1 + (hour % 24) / 24, peakPowerKw: 3 })),
    );
    const result = inspectHourlyProfileWorkbook(workbook);
    expect(result.status).toBe('valid');
    if (result.status !== 'valid') return;
    expect(result.candidate).toHaveLength(8_760);
    expect(result.candidate.at(-1)!.hourIndex).toBe(8_759);
  });

  it('refuse une série tronquée qui n’est ni une journée ni une année', () => {
    const workbook = exportHourlyProfileWorkbook(
      Array.from({ length: 168 }, (_, hour) => ({ hourIndex: hour, activePowerKw: 1, peakPowerKw: 2 })),
    );
    const result = inspectHourlyProfileWorkbook(workbook);
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') return;
    expect(result.issues.some((issue) => issue.code === 'HOURS_COUNT_INVALID')).toBe(true);
  });

  it('refuse une journée type dont les index sortent de 0..23', () => {
    const workbook = exportHourlyProfileWorkbook(
      Array.from({ length: 24 }, (_, hour) => ({ hourIndex: hour === 0 ? 500 : hour, activePowerKw: 1, peakPowerKw: 2 })),
    );
    const result = inspectHourlyProfileWorkbook(workbook);
    expect(result.status).toBe('invalid');
    if (result.status !== 'invalid') return;
    expect(result.issues.some((issue) => issue.code === 'HOUR_OUT_OF_RANGE')).toBe(true);
  });
});
