import { describe, expect, it } from 'vitest';
import {
  validateWeatherSeries,
  validateWeatherSeriesAssociation,
  weatherSeriesSchema,
} from '../../src/index.js';

const provenance = {
  sourceId: 'fixture:test',
  sourceRecordId: 'weather-1',
  sourceSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  transformationVersion: '1.0.0',
};

describe('weather contracts', () => {
  it('detects a missing interval and unknown variable', () => {
    const series = weatherSeriesSchema.parse({
      id: 'series-1',
      weatherSourceId: 'source-1',
      localityId: 'locality-1',
      timestampConvention: 'interval-end',
      intervalMinutes: 60,
      variables: [{ id: 'ghi_w_m2', unit: 'W/m2' }],
      observations: [
        { timestamp: '2026-01-01T00:00:00.000Z', values: { ghi_w_m2: 0 } },
        { timestamp: '2026-01-01T02:00:00.000Z', values: { unknown: 10 } },
      ],
      provenance,
    });
    expect(validateWeatherSeries(series).map((issue) => issue.code)).toEqual([
      'WEATHER_INTERVAL_INCONSISTENT',
      'WEATHER_VALUE_VARIABLE_UNKNOWN',
    ]);
  });

  it('rejects a weather series associated with different source or locality metadata', () => {
    const series = weatherSeriesSchema.parse({
      id: 'series-1', weatherSourceId: 'source-1', localityId: 'locality-1', timestampConvention: 'interval-start', intervalMinutes: 60,
      variables: [{ id: 'ghi_w_m2', unit: 'W/m2' }], observations: [{ timestamp: '2026-01-01T00:00:00.000Z', values: { ghi_w_m2: 0 } }], provenance,
    });
    const issues = validateWeatherSeriesAssociation(series, {
      id: 'source-2', localityId: 'locality-2', provider: 'PVGIS', sourceName: 'TMY', defaultTiltDeg: null, defaultAzimuthDeg: null, provenance,
    }, {
      id: 'locality-3', name: 'Lomé', countryCode: 'TG', latitudeDeg: 6.17, longitudeDeg: 1.23, elevationM: null, timezone: null, provenance,
    });
    expect(issues.map((issue) => issue.code)).toEqual([
      'WEATHER_SERIES_SOURCE_MISMATCH',
      'WEATHER_SERIES_LOCALITY_MISMATCH',
      'WEATHER_SOURCE_LOCALITY_REFERENCE_MISMATCH',
    ]);
  });
});
