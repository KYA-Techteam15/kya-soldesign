import { describe, expect, it } from 'vitest';
import { queryAnnualChart, type AnnualLoadSeries } from '../../src/load-profile/annual-chart.js';

const series: AnnualLoadSeries = {
  timezoneIana: 'UTC',
  points: [0, 1, 2, 24].map((hour, index) => ({
    timestampUtcIso: `2021-01-0${hour === 24 ? 2 : 1}T${String(hour % 24).padStart(2, '0')}:00:00.000Z`,
    localDateIso: hour === 24 ? '2021-01-02' : '2021-01-01',
    localHourIndex: hour % 24,
    periodId: index === 3 ? 'p2' : 'p1',
    dayGroupId: 'all', profileId: 'profile', activeEnergyWh: (index + 1) * 10, peakPowerW: (index + 1) * 20,
  })),
};

describe('annual chart queries', () => {
  it('defaults the year to daily and preserves energy in aggregation', () => {
    const result = queryAnnualChart({ series, query: { range: 'year', frequency: 'auto' } });
    expect(result.frequency).toBe('daily');
    expect(result.points).toHaveLength(2);
    expect(result.points[0]!.energyWh).toBe(60);
    expect(result.points[0]!.peakPowerW).toBe(60);
    expect(result.sourcePointCount).toBe(4);
  });

  it('uses hourly points for a selected day and filters periods', () => {
    const day = queryAnnualChart({ series, query: { range: 'day', frequency: 'auto', anchorDateIso: '2021-01-01' } });
    expect(day.frequency).toBe('hourly');
    expect(day.points).toHaveLength(3);
    const period = queryAnnualChart({ series, query: { range: 'period', frequency: 'daily', periodId: 'p2' } });
    expect(period.points).toHaveLength(1);
    expect(period.points[0]!.energyWh).toBe(40);
  });
});
