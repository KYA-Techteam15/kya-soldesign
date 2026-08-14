import { describe, expect, it } from 'vitest';
import { pvgisTmyHourlyRowSchema } from '../../src/weather-files.js';

const pvgisRow = {
  'time(UTC)': '20050101:0700',
  T2m: 25.52,
  RH: 100,
  'G(h)': 52,
  'Gb(n)': 38.32,
  'Gd(h)': 44,
  'IR(h)': -22.25,
  WS10m: -2.87,
  WD10m: 267,
  SP: 101_300,
};

describe('PVGIS TMY hourly evidence', () => {
  it('preserves signed auxiliary measurements returned by PVGIS 5.3', () => {
    expect(pvgisTmyHourlyRowSchema.parse(pvgisRow)).toEqual(pvgisRow);
  });

  it.each(['G(h)', 'Gb(n)', 'Gd(h)'] as const)('still rejects negative calculated solar input %s', (field) => {
    expect(pvgisTmyHourlyRowSchema.safeParse({ ...pvgisRow, [field]: -0.01 }).success).toBe(false);
  });
});
