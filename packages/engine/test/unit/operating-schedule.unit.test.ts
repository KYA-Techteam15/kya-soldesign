import { describe, expect, it } from 'vitest';
import { equipmentStartupPeakW, hourlyPeakPowerWithStartupsW, resizeOperatingSchedule } from '../../src/index.js';

const hoursOf = (fractions: readonly number[]) => fractions.flatMap((value, hour) => value > 0 ? [hour] : []);
const schedule = (hours: readonly number[]) => Array.from({ length: 24 }, (_, hour) => hours.includes(hour) ? 1 : 0);

describe('resizeOperatingSchedule', () => {
  it('lengthens only the last block of the day', () => {
    expect(hoursOf(resizeOperatingSchedule(5, schedule([6, 7, 18, 19])))).toEqual([6, 7, 18, 19, 20]);
  });

  it('shortens the last block first, then the previous one', () => {
    expect(hoursOf(resizeOperatingSchedule(3, schedule([6, 7, 18, 19])))).toEqual([6, 7, 18]);
    expect(hoursOf(resizeOperatingSchedule(1, schedule([6, 7, 18, 19])))).toEqual([6]);
  });

  it('treats a block crossing midnight as the last block', () => {
    expect(hoursOf(resizeOperatingSchedule(5, schedule([8, 22, 23, 0])))).toEqual([0, 1, 8, 22, 23]);
  });

  it('keeps the chosen hours when the duration only changes its fraction', () => {
    const result = resizeOperatingSchedule(2.5, schedule([10, 11, 12]));
    expect(hoursOf(result)).toEqual([10, 11, 12]);
    expect(result[12]).toBe(0.5);
  });

  it('falls back on the default range when nothing is scheduled', () => {
    expect(hoursOf(resizeOperatingSchedule(2, schedule([])))).toEqual([8, 9]);
  });

  it('handles a full day and an empty duration', () => {
    expect(hoursOf(resizeOperatingSchedule(23, schedule(Array.from({ length: 24 }, (_, hour) => hour))))).toHaveLength(23);
    expect(hoursOf(resizeOperatingSchedule(0, schedule([6, 7])))).toEqual([]);
  });
});

describe('startup peak', () => {
  it('adds running power × (multiplier − 1) at the starting hour', () => {
    const peaks = hourlyPeakPowerWithStartupsW([100, 100, 100], [{ hourIndex: 1, runningPowerW: 50, startupPowerMultiplier: 3 }, { hourIndex: 2, runningPowerW: 80, startupPowerMultiplier: null }]);
    expect(peaks).toEqual([100, 200, 100]);
  });

  it('gives the table the same startup peak as the sizing', () => {
    const rows = [
      { id: 'lamp', label: 'Lampe', quantity: 10, usefulPowerW: 15, efficiencyRatio: 1, hourlyOperatingFractions: schedule([18, 19]), startupPowerMultiplier: null },
      { id: 'pump', label: 'Pompe', quantity: 1, usefulPowerW: 800, efficiencyRatio: 0.8, hourlyOperatingFractions: schedule([18]), startupPowerMultiplier: 3 },
    ];
    // 18 h : 150 W de lampes + 1 000 W de pompe, et le démarrage de la pompe ajoute 2 × 1 000 W.
    expect(equipmentStartupPeakW(rows)).toBe(3150);
    expect(equipmentStartupPeakW([])).toBe(0);
    expect(equipmentStartupPeakW([{ ...rows[0]!, efficiencyRatio: null }])).toBeNull();
  });
});
