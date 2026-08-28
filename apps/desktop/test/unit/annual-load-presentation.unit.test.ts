import { describe, expect, it } from 'vitest';
import { buildAnnualLoadPresentation } from '../../src/app/models/annualLoadPresentation.js';
import type { ProjectViewModel } from '../../src/app/models/projectView.js';

const calendar = { version: 2 as const, mode: 'annual' as const, dayGroups: [{ id: 'all', kind: 'all-days' as const, weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }], periods: [{ id: 'year', name: 'Year', startMonthDay: '01-01', endMonthDay: '12-31' }], assignments: [{ periodId: 'year', dayGroupId: 'all', profileId: 'p' }] };

describe('annual load presentation', () => {
  it('builds a daily view and annual factor from the stored weather timestamps', () => {
    const timestamps = Array.from({ length: 24 }, (_, hour) => `2021-06-15T${String(hour).padStart(2, '0')}:00:00.000Z`);
    const project = { load: { activeProfileId: 'p', irMin: 10, calendar, profiles: [{ id: 'p', name: 'p', color: '#fff', source: 'hourly', classic: [], inductive: [], hourly: Array.from({ length: 24 }, (_, hour) => ({ hour, realPower: hour < 12 ? 1 : 0, peakPower: 1 })), meter: null }] }, site: { timezoneIana: 'UTC', downloadedSource: { hourlyIrradiance: timestamps.map((timestamp) => ({ timestampUtcIso: timestamp, ghiWm2: 0, dniWm2: 0, dhiWm2: 0 })) } } } as unknown as ProjectViewModel;
    const result = buildAnnualLoadPresentation(project, { hourlyPoaWm2: Array.from({ length: 24 }, (_, hour) => hour < 6 ? 100 : 0) } as never);
    expect(result?.daily).toHaveLength(1);
    expect(result?.yEn.status).toBe('available');
    if (result?.yEn.status === 'available') expect(result.yEn.annualGammaRatio).toBeCloseTo(0.5, 12);
  });
});
