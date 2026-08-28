import { describe, expect, it } from 'vitest';
import {
  buildAnnualLoadSeries,
  calculateAnnualYEn,
  validateAnnualCalendar,
  type AnnualLoadCalendar,
} from '../../src/load-profile/annual.js';

const calendar: AnnualLoadCalendar = {
  version: 2,
  mode: 'annual',
  dayGroups: [{ id: 'all', kind: 'all-days', weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }],
  periods: [{ id: 'year', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }],
  assignments: [{ periodId: 'year', dayGroupId: 'all', profileId: 'p1' }],
};

describe('annual load profiles', () => {
  it('validates exact day and period partitions', () => {
    expect(validateAnnualCalendar(calendar)).toEqual([]);
    expect(validateAnnualCalendar({ ...calendar, periods: [] })).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: 'CALENDAR_PERIODS_EMPTY' }),
    ]));
  });

  it('resolves a local calendar assignment and builds 24 hourly points', () => {
    const weather = Array.from({ length: 24 }, (_, hour) => ({
      timestampUtcIso: `2021-06-15T${String(hour).padStart(2, '0')}:00:00.000Z`,
      poaWm2: hour >= 8 && hour < 18 ? 800 : 0,
    }));
    const result = buildAnnualLoadSeries({
      timezoneIana: 'UTC', weather, calendar,
      profiles: [{ id: 'p1', hourlyEnergyWh: Array.from({ length: 24 }, () => 100), hourlyPeakPowerW: Array.from({ length: 24 }, () => 120) }],
    });
    expect(result.points).toHaveLength(24);
    expect(result.points[8]).toMatchObject({ localDateIso: '2021-06-15', localHourIndex: 8, periodId: 'year', dayGroupId: 'all', profileId: 'p1', activeEnergyWh: 100, peakPowerW: 120 });
  });

  it('weights local factors by annual load energy rather than day count', () => {
    const points = [
      ...Array.from({ length: 2 }, (_, hour) => ({ timestampUtcIso: `2021-01-01T${String(hour).padStart(2, '0')}:00:00.000Z`, localDateIso: '2021-01-01', localHourIndex: hour, periodId: 'p1', dayGroupId: 'g1', profileId: 'a', activeEnergyWh: 50, peakPowerW: 50 })),
      ...Array.from({ length: 2 }, (_, hour) => ({ timestampUtcIso: `2021-02-01T${String(hour).padStart(2, '0')}:00:00.000Z`, localDateIso: '2021-02-01', localHourIndex: hour, periodId: 'p2', dayGroupId: 'g1', profileId: 'b', activeEnergyWh: 150, peakPowerW: 150 })),
    ];
    const result = calculateAnnualYEn({
      series: { timezoneIana: 'UTC', points },
      poaByTimestamp: new Map([
        [points[0]!.timestampUtcIso, 100], [points[1]!.timestampUtcIso, 0],
        [points[2]!.timestampUtcIso, 0], [points[3]!.timestampUtcIso, 0],
      ]),
      thresholdWm2: 10,
    });
    expect(result.status).toBe('available');
    if (result.status === 'available') expect(result.annualGammaRatio).toBeCloseTo(50 / 400, 12);
  });

  it('keeps a zero-load result unavailable', () => {
    const result = calculateAnnualYEn({
      series: { timezoneIana: 'UTC', points: [{ timestampUtcIso: '2021-01-01T00:00:00.000Z', localDateIso: '2021-01-01', localHourIndex: 0, periodId: 'year', dayGroupId: 'all', profileId: 'p1', activeEnergyWh: 0, peakPowerW: 0 }] },
      poaByTimestamp: new Map([['2021-01-01T00:00:00.000Z', 100]]), thresholdWm2: 10,
    });
    expect(result).toEqual({ status: 'unavailable', reasonCode: 'LOAD_TOTAL_ZERO' });
  });
});
