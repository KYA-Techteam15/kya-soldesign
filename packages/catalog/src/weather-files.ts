import { z } from 'zod';

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/u);
const relativeJsonPathSchema = z.string().min(1).refine(
  (value) => value.endsWith('.json') && !value.includes('..') && !/^(?:[A-Za-z]:|[/\\])/u.test(value),
  'Expected a safe relative JSON path',
);

export const pvgisTmyHourlyRowSchema = z.object({
  'time(UTC)': z.string().regex(/^\d{8}:\d{4}$/u),
  T2m: z.number().finite(),
  RH: z.number().finite().min(0).max(100),
  'G(h)': z.number().finite().nonnegative(),
  'Gb(n)': z.number().finite().nonnegative(),
  'Gd(h)': z.number().finite().nonnegative(),
  // PVGIS 5.3 can return negative net long-wave radiation and isolated
  // negative wind-speed artefacts. Keep the signed source evidence intact;
  // neither auxiliary field is used by the solar-resource calculation.
  'IR(h)': z.number().finite(),
  WS10m: z.number().finite(),
  WD10m: z.number().finite().min(0).max(360),
  SP: z.number().finite().positive(),
}).strict();

export const pvgisTmyJsonSchema = z.object({
  inputs: z.object({
    location: z.object({
      latitude: z.number().finite().min(-90).max(90),
      longitude: z.number().finite().min(-180).max(180),
      elevation: z.number().finite(),
      irradiance_time_offset: z.number().finite(),
    }).strict(),
    meteo_data: z.object({
      radiation_db: z.string().min(1),
      meteo_db: z.string().min(1),
      year_min: z.number().int(),
      year_max: z.number().int(),
      use_horizon: z.boolean(),
      horizon_db: z.string().min(1),
    }).strict(),
  }).strict(),
  outputs: z.object({
    months_selected: z.array(z.object({
      month: z.number().int().min(1).max(12),
      year: z.number().int(),
    }).strict()).length(12),
    tmy_hourly: z.array(pvgisTmyHourlyRowSchema).length(8_760),
  }).strict(),
  meta: z.object({
    inputs: z.unknown(),
    outputs: z.unknown(),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.inputs.meteo_data.year_min > value.inputs.meteo_data.year_max) {
    context.addIssue({
      code: 'custom',
      path: ['inputs', 'meteo_data', 'year_min'],
      message: 'year_min must not exceed year_max',
    });
  }
  if (new Set(value.outputs.months_selected.map(({ month }) => month)).size !== 12) {
    context.addIssue({
      code: 'custom',
      path: ['outputs', 'months_selected'],
      message: 'TMY must select each calendar month exactly once',
    });
  }
});

export const weatherFileRecordSchema = z.object({
  id: z.string().min(1),
  weatherSourceId: z.string().min(1),
  localityId: z.string().min(1),
  format: z.literal('pvgis-tmy-json'),
  relativePath: relativeJsonPathSchema,
  sourceSha256: sha256Schema,
  apiVersion: z.literal('5.3'),
  providerEndpoint: z.string().url().startsWith('https://re.jrc.ec.europa.eu/'),
  latitudeDeg: z.number().finite().min(-90).max(90),
  longitudeDeg: z.number().finite().min(-180).max(180),
  timezoneIana: z.string().regex(/^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/u),
  radiationDatabase: z.string().min(1),
  yearMin: z.number().int(),
  yearMax: z.number().int(),
  hourlyRecordCount: z.literal(8_760),
  retrievedAtIso: z.iso.datetime({ offset: true }),
}).strict();

export const weatherFileManifestSchema = z.object({
  schemaVersion: z.literal(1),
  records: z.array(weatherFileRecordSchema).min(1),
}).strict();

export type PvgisTmyHourlyRow = z.infer<typeof pvgisTmyHourlyRowSchema>;
export type PvgisTmyJson = z.infer<typeof pvgisTmyJsonSchema>;
export type WeatherFileRecord = z.infer<typeof weatherFileRecordSchema>;
