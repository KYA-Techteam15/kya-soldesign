import { z } from 'zod';
import { deriveDailyLoadEnergyWh, loadItemSchema, normalizedHourlyProfileSchema, type LoadItem, type NormalizedHourlyProfile } from './load.js';
import { provenanceSchema } from './weather.js';

const finiteNonNegative = z.number().finite().min(0);
const positiveRatio = z.number().finite().gt(0).max(1);
const timezoneIanaSchema = z.string().regex(/^[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)+$/);

export const aioApplicationTypeSchema = z.enum([
  'residential', 'commercial', 'industrial', 'agricultural', 'other',
]);

export const startupEventV1Schema = z.object({
  hourIndex: z.number().int().min(0).max(23),
  runningPowerW: z.number().finite().gt(0),
  startupPowerMultiplier: z.number().finite().gte(1).nullable(),
  isInductive: z.boolean(),
  sourceRef: z.string().min(1),
}).strict().superRefine((value, context) => {
  if (value.isInductive && value.startupPowerMultiplier !== null && value.startupPowerMultiplier <= 1) {
    context.addIssue({ code: 'custom', message: 'inductive startup events require a multiplier greater than 1', path: ['startupPowerMultiplier'] });
  }
  if (!value.isInductive && value.startupPowerMultiplier !== 1) {
    context.addIssue({ code: 'custom', message: 'non-inductive startup events require the explicit neutral multiplier 1', path: ['startupPowerMultiplier'] });
  }
});

export const canonicalDailyLoadV1Schema = z.object({
  basis: z.enum(['equipment-schedule', 'direct-hourly-power', 'meter-estimate']),
  intervalMinutes: z.literal(60),
  timezoneIana: timezoneIanaSchema,
  hourlyEnergyWh: z.array(finiteNonNegative).length(24),
  startupEvents: z.array(startupEventV1Schema),
  derivation: z.object({
    method: z.string().min(1),
    sourceProfileId: z.string().min(1).optional(),
  }).strict().optional(),
}).strict();

export const technicalProjectContextV1Schema = z.object({
  applicationType: aioApplicationTypeSchema,
  site: z.object({
    localityId: z.string().min(1).optional(),
    latitudeDeg: z.number().finite().min(-90).max(90).optional(),
    longitudeDeg: z.number().finite().min(-180).max(180).optional(),
    arrayTiltDeg: z.number().finite().min(0).max(90).optional(),
    arrayAzimuthDeg: z.number().finite().min(0).lt(360).optional(),
  }).strict(),
}).strict();

export const solarDesignResourceV1Schema = z.object({
  selectionMethod: z.literal('declared-critical-month'),
  referencePeriod: z.object({ yearOrTypicalPeriod: z.string().min(1), month: z.number().int().min(1).max(12) }).strict(),
  planeOfArrayIrradiationKWhPerM2PerDay: z.number().finite().gt(0),
  arrayTiltDeg: z.number().finite().min(0).max(90),
  arrayAzimuthDeg: z.number().finite().min(0).lt(360),
  source: z.object({
    provider: z.string().min(1), datasetOrDocument: z.string().min(1), versionOrDate: z.string().min(1),
    locator: z.string().min(1), retrievedAtIso: z.string().datetime({ offset: true }), license: z.string().min(1).optional(),
  }).strict(),
  timeConvention: z.object({
    timezoneIana: timezoneIanaSchema,
    timestampConvention: z.enum(['interval-start', 'interval-center', 'interval-end']),
    intervalMinutes: z.number().int().positive(),
  }).strict().optional(),
  qualityFlags: z.array(z.string().min(1)),
  provenance: provenanceSchema,
}).strict();

export const assumptionSourceV1Schema = z.object({
  assumptionId: z.string().min(1),
  provenance: provenanceSchema,
  declaredBy: z.string().min(1),
}).strict();

export const aioAssumptionsV1Schema = z.object({
  inverterEfficiencyRatio: positiveRatio.optional(),
  pvPerformanceRatio: positiveRatio.optional(),
  autonomyDays: z.number().int().min(0).optional(),
  batteryChemistry: z.enum(['lead-acid', 'other', 'unknown']),
  depthOfDischargeRatio: positiveRatio.optional(),
  batteryDischargeEfficiencyRatio: positiveRatio.optional(),
  batteryNominalVoltageV: z.number().finite().gt(0).optional(),
  assumptionSources: z.array(assumptionSourceV1Schema),
}).strict();

export const aioSizingRequestV1Schema = z.object({
  schemaVersion: z.literal(1),
  technicalContext: technicalProjectContextV1Schema,
  load: canonicalDailyLoadV1Schema,
  solarDesignResource: solarDesignResourceV1Schema.optional(),
  assumptions: aioAssumptionsV1Schema,
  provenance: z.array(provenanceSchema).min(1),
}).strict();

export type StartupEventV1 = z.infer<typeof startupEventV1Schema>;
export type CanonicalDailyLoadV1 = z.infer<typeof canonicalDailyLoadV1Schema>;
export type TechnicalProjectContextV1 = z.infer<typeof technicalProjectContextV1Schema>;
export type SolarDesignResourceV1 = z.infer<typeof solarDesignResourceV1Schema>;
export type AioAssumptionsV1 = z.infer<typeof aioAssumptionsV1Schema>;
export type AioSizingRequestV1 = z.infer<typeof aioSizingRequestV1Schema>;

/** DATA-001 composition: each scheduled appliance contributes W × 1h to the canonical daily series. */
export function normalizeEquipmentScheduleToAioDailyLoad(input: {
  readonly timezoneIana: string;
  readonly items: readonly LoadItem[];
  readonly startupEvents: readonly StartupEventV1[];
}): CanonicalDailyLoadV1 {
  const items = input.items.map((item) => loadItemSchema.parse(item));
  const hourlyEnergyWh = Array.from({ length: 24 }, (_, hour) => items.reduce(
    (total, item) => total + item.activePowerW * item.quantity * item.simultaneityRatio * item.hourlyOperatingFractions[hour]!,
    0,
  ));
  const expectedDailyEnergyWh = items.reduce((total, item) => total + deriveDailyLoadEnergyWh(item), 0);
  const actualDailyEnergyWh = hourlyEnergyWh.reduce((total, value) => total + value, 0);
  const conservationToleranceWh = 1e-9 * Math.max(1, Math.abs(expectedDailyEnergyWh));
  if (Math.abs(expectedDailyEnergyWh - actualDailyEnergyWh) > conservationToleranceWh) throw new RangeError('equipment schedule energy conservation failed');
  return canonicalDailyLoadV1Schema.parse({ basis: 'equipment-schedule', intervalMinutes: 60, timezoneIana: input.timezoneIana, hourlyEnergyWh, startupEvents: input.startupEvents });
}

/** DATA-001 boundary conversion: 24 one-hour average powers become their numerically equal Wh values. */
export function normalizeDirectHourlyPowerToAioDailyLoad(input: {
  readonly timezoneIana: string;
  readonly hourlyPowerW: readonly number[];
  readonly startupEvents: readonly StartupEventV1[];
}): CanonicalDailyLoadV1 {
  return canonicalDailyLoadV1Schema.parse({ basis: 'direct-hourly-power', intervalMinutes: 60, timezoneIana: input.timezoneIana, hourlyEnergyWh: input.hourlyPowerW, startupEvents: input.startupEvents });
}

/** DATA-001 composition: a metered period can create a peak-capable daily profile only through a sourced normalized profile. */
export function normalizeMeterEstimateToAioDailyLoad(input: {
  readonly timezoneIana: string;
  readonly observedEnergyWh: number;
  readonly observedDays: number;
  readonly profile: NormalizedHourlyProfile;
  readonly startupEvents: readonly StartupEventV1[];
}): CanonicalDailyLoadV1 {
  if (!Number.isFinite(input.observedEnergyWh) || input.observedEnergyWh < 0 || !Number.isInteger(input.observedDays) || input.observedDays <= 0) {
    throw new RangeError('meter estimate requires finite non-negative energy and an exact positive observedDays');
  }
  const profile = normalizedHourlyProfileSchema.parse(input.profile);
  const dailyEnergyWh = input.observedEnergyWh / input.observedDays;
  return canonicalDailyLoadV1Schema.parse({
    basis: 'meter-estimate', intervalMinutes: 60, timezoneIana: input.timezoneIana,
    hourlyEnergyWh: profile.hourlyEnergyFractions.map((fraction) => dailyEnergyWh * fraction),
    startupEvents: input.startupEvents,
    derivation: { method: `metered-period/${input.observedDays}-days`, sourceProfileId: profile.id },
  });
}
