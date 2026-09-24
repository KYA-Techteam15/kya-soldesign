import { describe, expect, it } from 'vitest';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { activeLoadSource, inventoryDirectProfile, isLoadEmpty } from '../../src/app/models/loadSources.js';
import { effectiveHourlyPoints, parseProjectInputsV1 } from '../../src/app/models/projectInputs.js';
import { composedMonthStrip } from '../../src/routes/workshop/loads/ComposedSummary.js';

const year = Array.from({ length: 8_760 }, (_, hour) => ({ hour, realPower: (hour % 24) >= 8 && (hour % 24) < 18 ? 2 : 0.5, peakPower: null }));

function freshView() {
  return projectFileToView(new InMemoryProjects(() => '2026-09-24T10:00:00.000Z', () => '00000000-0000-4000-8000-000000000401').create('standalone-all-in-one', 'fr'));
}

describe('load sources (spec 011, D1)', () => {
  it('starts empty, on the appliances source', () => {
    const view = freshView();
    expect(isLoadEmpty(view)).toBe(true);
    expect(activeLoadSource(view)).toBe('equipments');
  });

  it('keeps every source when switching, and computes only with the active one', () => {
    const view = freshView();
    const profile = view.load.profiles[0]!;
    profile.appliances.push({ id: 'a', name: 'Lampe', qty: 1, unitPower: 10, yield: 1, operatingFractions: Array.from({ length: 24 }, () => 0), opHours: 0, startupCoef: 1, inductive: false });
    profile.hourly[3]!.realPower = 1.5;
    profile.annual = year;
    profile.annualSourceName = 'releve.csv';
    profile.source = 'annual';
    const file = projectViewToFile(view);
    const stored = parseProjectInputsV1(file.inputs).load.profiles[0]!;
    expect(stored.source).toBe('annual');
    expect(stored.hourlyPoints).toHaveLength(24);
    expect(stored.annualPoints).toHaveLength(8_760);
    expect(effectiveHourlyPoints(stored)).toHaveLength(8_760);

    const back = projectFileToView(file);
    back.load.profiles[0]!.source = 'hourly';
    const again = projectFileToView(projectViewToFile(back)).load.profiles[0]!;
    expect(again.appliances).toHaveLength(1);
    expect(again.hourly[3]!.realPower).toBe(1.5);
    expect(again.annual).toHaveLength(8_760);
    expect(again.annualSourceName).toBe('releve.csv');
    expect(effectiveHourlyPoints(parseProjectInputsV1(projectViewToFile(back).inputs).load.profiles[0]!)).toHaveLength(24);
  });

  it('moves a 1.0 year stored in the typical day to the imported year', () => {
    const view = freshView();
    const file = projectViewToFile(view);
    const inputs = file.inputs as { load: { profiles: { source: string; hourlyPoints: unknown[] }[] } };
    inputs.load.profiles[0]!.source = 'hourly';
    inputs.load.profiles[0]!.hourlyPoints = year.map((point) => ({ hourIndex: point.hour, activePowerW: point.realPower * 1000, peakPowerW: null }));
    const migrated = projectFileToView(file).load.profiles[0]!;
    expect(migrated.source).toBe('annual');
    expect(migrated.annual).toHaveLength(8_760);
    expect(migrated.hourly).toHaveLength(24);
    expect(migrated.hourly.every((point) => point.realPower === 0)).toBe(true);
  });

  it('keeps an empty peak as “equal to the average”', () => {
    const view = freshView();
    view.load.profiles[0]!.hourly[5] = { hour: 5, realPower: 1, peakPower: null };
    view.load.profiles[0]!.hourly[6] = { hour: 6, realPower: 1, peakPower: 3 };
    const back = projectFileToView(projectViewToFile(view)).load.profiles[0]!;
    expect(back.hourly[5]!.peakPower).toBeNull();
    expect(back.hourly[6]!.peakPower).toBe(3);
  });

  it('derives a composed profile from the inventory, start-up peak included', () => {
    const on = Array.from({ length: 24 }, (_, hour) => hour === 9 ? 1 : 0);
    const profile = inventoryDirectProfile([
      { id: 'pump', name: 'Pompe', qty: 1, unitPower: 800, yield: 0.8, operatingFractions: on, opHours: 1, startupCoef: 3, inductive: true },
    ], { id: 'p', name: 'P', color: '#000' });
    expect(profile.hourly[9]!.realPower).toBeCloseTo(1, 9);
    expect(profile.hourly[9]!.peakPower).toBeCloseTo(3, 9);
    expect(profile.hourly[10]!.realPower).toBe(0);
  });

  it('shows which profile each month receives, and the gaps', () => {
    const strip = composedMonthStrip({
      organization: 'periods',
      calendar: {
        version: 2, mode: 'periods',
        dayGroups: [{ id: 'all', kind: 'all-days', weekdaysIso: [1, 2, 3, 4, 5, 6, 7] }],
        periods: [{ id: 'hot', name: 'Chaude', startMonthDay: '02-01', endMonthDay: '05-31' }, { id: 'mild', name: 'Tempérée', startMonthDay: '06-01', endMonthDay: '10-31' }],
        assignments: [{ periodId: 'hot', dayGroupId: 'all', profileId: 'H' }, { periodId: 'mild', dayGroupId: 'all', profileId: 'M' }],
      },
      profiles: [],
    }, 'all');
    expect(strip).toEqual([null, 'H', 'H', 'H', 'H', 'M', 'M', 'M', 'M', 'M', null, null]);
  });
});
