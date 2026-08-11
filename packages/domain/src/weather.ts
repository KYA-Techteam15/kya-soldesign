import { z } from 'zod';
import type { DataIssue } from './contracts.js';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const semverSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const ianaTimezoneSchema = z.string().regex(/^[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)+$/);

export const provenanceSchema = z.object({
  sourceId: z.string().min(1),
  sourceRecordId: z.string().min(1),
  sourceSha256: sha256Schema,
  transformationVersion: semverSchema,
}).strict();

export const localitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  countryCode: z.string().regex(/^[A-Z]{2}$/),
  latitudeDeg: z.number().finite().min(-90).max(90),
  longitudeDeg: z.number().finite().min(-180).max(180),
  elevationM: z.number().finite().nullable(),
  timezone: ianaTimezoneSchema.nullable(),
  provenance: provenanceSchema,
}).strict();

export const weatherSourceSchema = z.object({
  id: z.string().min(1),
  localityId: z.string().min(1),
  provider: z.string().min(1),
  sourceName: z.string().min(1),
  defaultTiltDeg: z.number().finite().min(0).max(90).nullable(),
  defaultAzimuthDeg: z.number().finite().min(0).lt(360).nullable(),
  provenance: provenanceSchema,
}).strict();

export const weatherVariableSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9_]*$/),
  unit: z.string().min(1),
}).strict();

export const weatherObservationSchema = z.object({
  timestamp: z.string().datetime({ offset: true }),
  values: z.record(z.string(), z.number().finite().nullable()),
}).strict();

export const weatherSeriesSchema = z.object({
  id: z.string().min(1),
  weatherSourceId: z.string().min(1),
  localityId: z.string().min(1),
  timestampConvention: z.enum(['interval-start', 'interval-center', 'interval-end']),
  intervalMinutes: z.number().int().positive(),
  variables: z.array(weatherVariableSchema).min(1),
  observations: z.array(weatherObservationSchema).min(1),
  provenance: provenanceSchema,
}).strict();

export type Locality = z.infer<typeof localitySchema>;
export type WeatherSource = z.infer<typeof weatherSourceSchema>;
export type WeatherSeries = z.infer<typeof weatherSeriesSchema>;

export function validateWeatherSeries(series: WeatherSeries): readonly DataIssue[] {
  const issues: DataIssue[] = [];
  const variableIds = series.variables.map((variable) => variable.id);
  const duplicateVariableIds = variableIds.filter((id, index) => variableIds.indexOf(id) !== index);
  if (duplicateVariableIds.length > 0) {
    issues.push({
      code: 'WEATHER_VARIABLE_ID_DUPLICATE',
      severity: 'error',
      message: 'Weather variable identifiers must be unique',
      path: 'variables',
    });
  }

  for (let index = 1; index < series.observations.length; index += 1) {
    const previousObservation = series.observations[index - 1];
    const currentObservation = series.observations[index];
    if (!previousObservation || !currentObservation) continue;
    const previous = Date.parse(previousObservation.timestamp);
    const current = Date.parse(currentObservation.timestamp);
    if (current <= previous) {
      issues.push({
        code: 'WEATHER_TIMESTAMP_NOT_STRICTLY_ORDERED',
        severity: 'error',
        message: 'Weather observation timestamps must be strictly increasing',
        path: `observations.${index}.timestamp`,
      });
      continue;
    }
    if (current - previous !== series.intervalMinutes * 60_000) {
      issues.push({
        code: 'WEATHER_INTERVAL_INCONSISTENT',
        severity: 'error',
        message: 'Weather observation interval does not match intervalMinutes',
        path: `observations.${index}.timestamp`,
      });
    }
  }

  const knownVariables = new Set(variableIds);
  for (const [index, observation] of series.observations.entries()) {
    for (const variableId of Object.keys(observation.values)) {
      if (!knownVariables.has(variableId)) {
        issues.push({
          code: 'WEATHER_VALUE_VARIABLE_UNKNOWN',
          severity: 'error',
          message: `Weather value references undeclared variable ${variableId}`,
          path: `observations.${index}.values.${variableId}`,
        });
      }
    }
  }
  return issues;
}

export function validateWeatherSeriesAssociation(
  series: WeatherSeries,
  weatherSource: WeatherSource,
  locality: Locality,
): readonly DataIssue[] {
  const issues: DataIssue[] = [];
  if (series.weatherSourceId !== weatherSource.id) {
    issues.push({
      code: 'WEATHER_SERIES_SOURCE_MISMATCH',
      severity: 'error',
      message: 'weatherSourceId must identify the supplied weather source metadata',
      path: 'weatherSourceId',
    });
  }
  if (series.localityId !== weatherSource.localityId) {
    issues.push({
      code: 'WEATHER_SERIES_LOCALITY_MISMATCH',
      severity: 'error',
      message: 'series localityId must match the weather source localityId',
      path: 'localityId',
    });
  }
  if (weatherSource.localityId !== locality.id) {
    issues.push({
      code: 'WEATHER_SOURCE_LOCALITY_REFERENCE_MISMATCH',
      severity: 'error',
      message: 'weather source localityId must identify the supplied locality metadata',
      path: 'localityId',
    });
  }
  return issues;
}
