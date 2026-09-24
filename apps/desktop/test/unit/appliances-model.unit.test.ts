import { describe, expect, it } from 'vitest';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { HOUR_PRESETS, formatHourBlocks, hourBlocks, scheduleFromHours } from '../../src/app/models/operatingHours.js';

const workday = Array.from({ length: 24 }, (_, hour) => hour >= 8 && hour < 12 ? 1 : 0);

function freshView() {
  return projectFileToView(new InMemoryProjects(() => '2026-09-24T10:00:00.000Z', () => '00000000-0000-4000-8000-000000000301').create('standalone-all-in-one', 'fr'));
}

describe('appliances (spec 011, D2)', () => {
  it('stores a start coefficient above 1 as an inductive start and 1 as a classic load', () => {
    const view = freshView();
    view.load.profiles[0]!.appliances.push(
      { id: 'lamp', name: 'Lampe', qty: 4, unitPower: 15, yield: 1, operatingFractions: workday, opHours: 4, startupCoef: 1, inductive: false },
      { id: 'pump', name: 'Pompe', qty: 1, unitPower: 750, yield: 0.8, operatingFractions: workday, opHours: 4, startupCoef: 5, inductive: true },
    );
    const file = projectViewToFile(view);
    const items = (file.inputs as { load: { profiles: { items: { id: string; startupPowerMultiplier: number | null; inductive?: boolean }[] }[] } }).load.profiles[0]!.items;
    expect(items.find((item) => item.id === 'lamp')).toMatchObject({ startupPowerMultiplier: null });
    expect(items.find((item) => item.id === 'lamp')).not.toHaveProperty('inductive');
    expect(items.find((item) => item.id === 'pump')).toMatchObject({ startupPowerMultiplier: 5 });
    const again = projectFileToView(file).load.profiles[0]!.appliances;
    expect(again.map((row) => [row.id, row.startupCoef, row.inductive])).toEqual([['lamp', 1, false], ['pump', 5, true]]);
  });

  it('keeps a manually declared inductive appliance whose coefficient is still to specify', () => {
    const view = freshView();
    view.load.profiles[0]!.appliances.push({ id: 'fridge', name: 'Frigo', qty: 1, unitPower: 150, yield: 0.85, operatingFractions: workday, opHours: 4, startupCoef: 1, inductive: true });
    const file = projectViewToFile(view);
    const item = (file.inputs as { load: { profiles: { items: { startupPowerMultiplier: number | null; inductive?: boolean }[] }[] } }).load.profiles[0]!.items[0]!;
    expect(item).toMatchObject({ startupPowerMultiplier: null, inductive: true });
    expect(projectFileToView(file).load.profiles[0]!.appliances[0]).toMatchObject({ startupCoef: 1, inductive: true });
  });

  it('lists once the appliances of an old project whose simultaneity was below 1, then never writes it again', () => {
    const view = freshView();
    view.load.profiles[0]!.appliances.push({ id: 'fan', name: 'Ventilateur', qty: 2, unitPower: 50, yield: 1, operatingFractions: workday, opHours: 4, startupCoef: 1, inductive: false });
    const file = projectViewToFile(view);
    const inputs = file.inputs as { load: { simultaneityNotice?: unknown; profiles: { items: Record<string, unknown>[] }[] } };
    // Fichier 1.0 : la simultanéité existait, l'avis non.
    delete inputs.load.simultaneityNotice;
    inputs.load.profiles[0]!.items[0]!.simultaneityRatio = 0.5;
    const migrated = projectFileToView(file);
    expect(migrated.load.simultaneityNotice).toEqual(['Ventilateur']);
    const saved = projectViewToFile(migrated).inputs as { load: { simultaneityNotice: string[] | null; profiles: { items: Record<string, unknown>[] }[] } };
    expect(saved.load.profiles[0]!.items[0]).not.toHaveProperty('simultaneityRatio');
    expect(saved.load.simultaneityNotice).toEqual(['Ventilateur']);
    migrated.load.simultaneityNotice = null;
    expect(projectFileToView(projectViewToFile(migrated)).load.simultaneityNotice).toBeNull();
  });
});

describe('operating hours helpers (spec 011, D4)', () => {
  it('describes blocks with neutral hours, including one crossing midnight', () => {
    expect(formatHourBlocks([6, 7, 18, 19, 20])).toBe('06–08 · 18–21');
    expect(formatHourBlocks([22, 23, 0, 1])).toBe('22–02');
    expect(formatHourBlocks([18, 19, 20, 21, 22, 23])).toBe('18–24');
    expect(formatHourBlocks(Array.from({ length: 24 }, (_, hour) => hour))).toBe('00–24');
    expect(hourBlocks([])).toEqual([]);
  });

  it('names presets by their ranges only', () => {
    expect(HOUR_PRESETS.map((preset) => formatHourBlocks(preset.hours))).toEqual(['08–16', '08–12 · 14–18', '18–24', '22–06', '00–24']);
  });

  it('keeps a fractional duration when the painted hours match it, and follows the painting otherwise', () => {
    const kept = scheduleFromHours(4.5, [8, 9, 10, 11, 12]);
    expect(kept.durationHours).toBe(4.5);
    expect(kept.fractions[12]).toBe(0.5);
    expect(scheduleFromHours(4, [8, 9, 10, 11, 12, 13]).durationHours).toBe(6);
    expect(scheduleFromHours(4, []).durationHours).toBe(0);
  });
});
