import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeSolarResource } from '../../src/solar-resource/index.js';

const weatherPath = resolve(import.meta.dirname, '../../../catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json');
const provenance = {
  sourceId: 'weather-file_pvgis53_bombouaka',
  sourceRecordId: 'weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json',
  sourceSha256: '05dffc44112ac96fecf01143abc63d2d32faf88df069fb15485229a999ebb3a6',
  transformationVersion: '1.1.0',
};

function timestampUtcIso(value: string): string {
  return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T${value.slice(9, 11)}:${value.slice(11, 13)}:00.000Z`;
}

describe('Bombouaka PVGIS TMY solar analysis', () => {
  it('matches a pvlib 0.13.1 Klucher reference and derives monthly/hourly resources and gamma', async () => {
    const document = JSON.parse(await readFile(weatherPath, 'utf8')) as {
      outputs: { tmy_hourly: { 'time(UTC)': string; 'G(h)': number; 'Gb(n)': number; 'Gd(h)': number }[] };
    };
    const envelope = analyzeSolarResource({
      latitudeDeg: 10.703,
      longitudeDeg: 0.2099,
      surfaceTiltDeg: 15,
      surfaceAzimuthDeg: 180,
      albedo: 0.2,
      intervalMinutes: 60,
      timestampConvention: 'interval-center',
      timezoneOffsetMinutes: 0,
      observations: document.outputs.tmy_hourly.map((row) => ({
        timestampUtcIso: timestampUtcIso(row['time(UTC)']),
        ghiWm2: row['G(h)'],
        dniWm2: row['Gb(n)'],
        dhiWm2: row['Gd(h)'],
      })),
      loadHourlyEnergyWh: Array.from({ length: 24 }, () => 100),
      loadHourlyPeakPowerW: Array.from({ length: 24 }, () => 150),
      minimumOperationalIrradianceWm2: 10,
      provenance,
    });

    expect(envelope.output.hourlyPoaWm2).toHaveLength(8_760);
    expect(envelope.output.monthlyAverageDailyPoaKWhM2Day).toHaveLength(12);
    expect(envelope.output.meanHourlyPoaWm2).toHaveLength(24);
    expect(envelope.output.monthlyMeanHourlyPoaWm2).toHaveLength(12);
    expect(envelope.output.monthlyMeanHourlyPoaWm2.every((series) => series.length === 24)).toBe(true);
    const pvlibMonthly = [5.93123915886, 7.529816937607, 7.032630503001, 6.572713666185, 6.113154329319, 5.786602412583, 4.816867552207, 4.544718566879, 5.680624417431, 5.981958988106, 6.964974925103, 7.041850703663];
    // NOAA's compact position model stays within 0.05 kWh/m²/day of pvlib SPA on this full-year fixture.
    pvlibMonthly.forEach((expected, month) => expect(envelope.output.monthlyAverageDailyPoaKWhM2Day[month]).toBeCloseTo(expected, 1));
    expect(envelope.output.annualPoaKWhM2).toBeCloseTo(2246.317350755184, 0);
    expect(envelope.output.designMonth).toBe(8);
    expect(envelope.output.gamma).toMatchObject({ status: 'available', value: 0.5, thresholdWm2: 10 });
    expect(envelope.output.loadHourlyEnergyWh).toEqual(Array.from({ length: 24 }, () => 100));
    expect(envelope.output.loadHourlyPeakPowerW).toEqual(Array.from({ length: 24 }, () => 150));
    expect(envelope.provenance).toEqual([provenance]);
    expect(envelope.inputHash).toMatch(/^fnv1a64:[a-f0-9]{16}$/u);
    expect(envelope.trace.map((entry) => entry.formulaId)).toEqual(expect.arrayContaining(['CALC-P1-008', 'CALC-P1-009', 'CALC-P1-010', 'CALC-P1-011']));
    expect(envelope.issues).toEqual([]);
  });

  it('keeps gamma unavailable when no 24-hour load is supplied', () => {
    const envelope = analyzeSolarResource({
      latitudeDeg: 10.703, longitudeDeg: 0.2099, surfaceTiltDeg: 15, surfaceAzimuthDeg: 180,
      albedo: 0.2, intervalMinutes: 60, timestampConvention: 'interval-center', timezoneOffsetMinutes: 0,
      observations: [{ timestampUtcIso: '2009-01-01T12:00:00.000Z', ghiWm2: 800, dniWm2: 700, dhiWm2: 150 }],
      minimumOperationalIrradianceWm2: 10,
      provenance,
    });
    expect(envelope.output.gamma).toEqual({ status: 'unavailable', reasonCode: 'LOAD_PROFILE_MISSING' });
  });
});
