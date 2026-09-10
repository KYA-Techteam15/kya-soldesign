import { z } from 'zod';
import { solarIrradianceObservationV1Schema } from '@ksd/domain';

const nullableFinite = z.number().finite().nullable();
const nullableNonNegative = z.number().finite().min(0).nullable();
const nullablePositive = z.number().finite().positive().nullable();
const nullableRatio = z.number().finite().min(0).max(1).nullable();
const nullableInteger = z.number().int().min(0).nullable();
const timezoneIana = z.string().regex(/^[A-Za-z_+-]+(?:\/[A-Za-z_+-]+)+$/);
const localTime = z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d$/);
const calendarDate = z.string().regex(/^$|^\d{4}-\d{2}-\d{2}$/);

export const applicationTypeSchema = z.enum([
  'residential',
  'commercial',
  'industrial',
  'agricultural',
]);

export const projectDetailsInputV1Schema = z.object({
  clientName: z.string(),
  clientAddress: z.string(),
  clientPhone: z.string(),
  clientEmail: z.union([z.literal(''), z.email()]),
  projectOfficerName: z.string(),
  applicationType: applicationTypeSchema,
  projectDate: calendarDate.nullable(),
  projectNumber: z.string(),
  projectLocationLabel: z.string(),
  projectImageRef: z.string().nullable(),
}).strict();

export const siteInputV1Schema = z.object({
  countryCode: z.string().regex(/^[A-Z]{2}$/).nullable(),
  localityId: z.string().min(1).nullable(),
  regionLabel: z.string(),
  latitudeDeg: z.number().finite().min(-90).max(90).nullable(),
  longitudeDeg: z.number().finite().min(-180).max(180).nullable(),
  arrayTiltDeg: z.number().finite().min(0).max(90).nullable(),
  arrayAzimuthDeg: z.number().finite().min(0).lt(360).nullable(),
  weatherSourceId: z.string().min(1).nullable(),
  timezoneIana: timezoneIana.nullable(),
  designMonth: z.number().int().min(1).max(12).nullable(),
  solarResource: z.object({
    weatherSourceId: z.string().min(1),
    provider: z.string().min(1),
    datasetOrDocument: z.string(),
    versionOrDate: z.string(),
    locator: z.string(),
    retrievedAtIso: z.union([z.literal(''), z.string().datetime({ offset: true })]),
    monthlyPlaneOfArrayIrradiationKWhPerM2PerDay: z.array(nullableNonNegative).length(12),
    arrayTiltDeg: z.number().finite().min(0).max(90),
    arrayAzimuthDeg: z.number().finite().min(0).lt(360),
    qualityFlags: z.array(z.string().min(1)),
    weatherFileId: z.string().min(1).optional(),
    sourceSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
    timezoneOffsetMinutes: z.number().int().min(-840).max(840).optional(),
    albedo: z.number().finite().min(0).max(1).optional(),
    hourlyIrradiance: z.array(solarIrradianceObservationV1Schema).length(8_760).optional(),
  }).strict().nullable(),
}).strict();

export const projectLoadItemV1Schema = z.object({
  id: z.string().min(1),
  label: z.string(),
  quantity: z.number().int().positive(),
  usefulPowerW: z.number().finite().min(0),
  powerFactor: z.number().finite().gt(0).max(1).nullable(),
  simultaneityRatio: nullableRatio,
  efficiencyRatio: z.number().finite().gt(0).max(1).nullable(),
  hourlyOperatingFractions: z.array(z.number().finite().min(0).max(1)).length(24),
  startupPowerMultiplier: z.number().finite().min(1).nullable(),
}).strict();

export const hourlyLoadPointV1Schema = z.object({
  // 0..23 pour une journée type, 0..8759 pour une année complète.
  hourIndex: z.number().int().min(0).max(8_759),
  activePowerW: z.number().finite().min(0),
  peakPowerW: z.number().finite().min(0).nullable(),
}).strict();

/**
 * Une série horaire décrit une journée type ou une année entière, jamais un
 * fragment : une longueur intermédiaire laisserait la répétition fabriquer une
 * saisonnalité que personne n'a saisie.
 */
const hourlySeriesSchema = z.array(hourlyLoadPointV1Schema)
  .refine((points) => points.length === 24 || points.length === 8_760, {
    message: 'An hourly series must hold exactly 24 or 8760 points',
  });

export const meterLoadInputV1Schema = z.object({
  observedEnergyWh: nullableNonNegative,
  observedDays: z.number().int().positive().nullable(),
  normalizedProfileId: z.string().min(1).nullable(),
  meterCurrentA: nullablePositive,
  networkType: z.enum(['single-phase', 'three-phase']),
  morningPeak: z.object({ startLocalTime: localTime, endLocalTime: localTime }).strict(),
  eveningPeak: z.object({ startLocalTime: localTime, endLocalTime: localTime }).strict(),
  peakImportanceRatio: nullableRatio,
  targetQualityFactor: nullableFinite,
  forceYEn: z.boolean().default(false),
  targetYEn: nullableRatio,
}).strict();

export const loadProfileInputV1Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayColor: z.string().min(1),
  source: z.enum(['equipment', 'hourly', 'meter']),
  items: z.array(projectLoadItemV1Schema),
  hourlyPoints: hourlySeriesSchema,
  meter: meterLoadInputV1Schema.nullable(),
}).strict();

const loadCalendarInputV2Schema = z.object({
  version: z.literal(2),
  mode: z.enum(['annual', 'workweek-weekend', 'periods', 'periods-by-day-type']),
  dayGroups: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(['all-days', 'workweek', 'weekend']),
    weekdaysIso: z.array(z.number().int().min(1).max(7)).min(1),
  }).strict()).min(1),
  periods: z.array(z.object({
    id: z.string().min(1), name: z.string().min(1),
    startMonthDay: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u),
    endMonthDay: z.string().regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/u),
    displayColor: z.string().min(1).optional(),
  }).strict()).min(1),
  assignments: z.array(z.object({ periodId: z.string().min(1), dayGroupId: z.string().min(1), profileId: z.string().min(1) }).strict()),
}).strict();

const directLoadProfileInputV2Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  displayColor: z.string().min(1),
  hourlyPoints: z.array(hourlyLoadPointV1Schema).length(24),
}).strict();

const composedLoadInputV2Schema = z.object({
  organization: z.enum(['workweek-weekend', 'periods', 'periods-by-day-type']),
  calendar: loadCalendarInputV2Schema,
  profiles: z.array(directLoadProfileInputV2Schema).min(1),
}).strict();

export const loadInputV1Schema = z.object({
  granularity: z.enum(['annual', 'weekly', 'daily', 'monthly', 'periodic', 'combined', 'workweek-weekend', 'periods', 'periods-by-day-type']),
  activeMode: z.enum(['simple', 'composed']).optional(),
  activeProfileId: z.string().min(1),
  minimumOperatingIrradianceWPerM2: z.number().finite().min(0).nullable(),
  profiles: z.array(loadProfileInputV1Schema).min(1),
  calendar: loadCalendarInputV2Schema.optional(),
  composed: composedLoadInputV2Schema.nullable().optional(),
}).strict().superRefine((value, context) => {
  if (!value.profiles.some((profile) => profile.id === value.activeProfileId)) {
    context.addIssue({
      code: 'custom',
      message: 'activeProfileId must identify an existing load profile',
      path: ['activeProfileId'],
    });
  }
  if (value.composed !== undefined && value.composed !== null) {
    const profileIds = new Set(value.composed.profiles.map((profile) => profile.id));
    value.composed.calendar.assignments.forEach((assignment, index) => {
      if (!profileIds.has(assignment.profileId)) context.addIssue({ code: 'custom', message: 'Composed assignments must identify a composed profile', path: ['composed', 'calendar', 'assignments', index, 'profileId'] });
    });
  }
});

export const assumptionInputV1Schema = z.object({
  maxLpspRatio: nullableRatio,
  maxLolpRatio: nullableRatio,
  systemPerformanceRatio: nullableRatio,
  inverterEfficiencyRatio: nullableRatio,
  batteryEfficiencyRatio: nullableRatio,
  batteryNominalVoltageV: nullablePositive,
  pvCostInputMode: z.enum(['specific', 'component']).optional(),
  pvReferencePowerW: nullablePositive.optional(),
  pvReferencePriceMinor: nullableInteger.optional(),
  storageCostInputMode: z.enum(['specific', 'component']).optional(),
  storageReferencePriceMinor: nullableInteger.optional(),
  storageReferenceKwh: nullablePositive.optional(),
  inverterCostInputMode: z.enum(['specific', 'component']).optional(),
  inverterReferencePowerW: nullablePositive.optional(),
  inverterReferencePriceMinor: nullableInteger.optional(),
  batteryDodRatio: nullableRatio,
  pvSpecificCostMinorPerKw: nullableInteger,
  pvMarginRatio: nullableRatio,
  batterySpecificCostMinorPerKwh: nullableInteger,
  batteryMarginRatio: nullableRatio,
  inverterSpecificCostMinorPerKw: nullableInteger,
  inverterMarginRatio: nullableRatio,
  projectLifetimeYears: nullableInteger,
  pvLifetimeYears: nullableInteger,
  batteryLifetimeYears: nullableInteger,
  inverterLifetimeYears: nullableInteger,
  pvMaintenanceRatioPerYear: nullableRatio,
  batteryMaintenanceRatioPerYear: nullableRatio,
  inverterMaintenanceRatioPerYear: nullableRatio,
  discountRateRatio: nullableRatio,
  gridTariffMinorPerKwh: nullableInteger,
  gridEmissionKgCo2PerKwh: nullableNonNegative,
  selfConsumptionRatio: nullableRatio,
  dieselSpecificCostMinorPerKw: nullableInteger,
}).strict();

export const circuitSegmentSchema = z.enum([
  'pv-inverter',
  'inverter-battery',
  'inverter-load',
]);

export const cableChoiceInputV1Schema = z.object({
  segment: circuitSegmentSchema,
  lengthM: nullableNonNegative,
  material: z.enum(['copper', 'aluminium']),
  installation: z.enum(['buried', 'not-buried']),
  maxVoltageDropPercent: nullablePositive.optional(),
}).strict();

export const protectionChoiceInputV1Schema = z.object({
  segment: circuitSegmentSchema,
  ratingA: nullablePositive,
  selectedType: z.enum(['Fusible gPV', 'Fusible gG', 'Disjoncteur DC', 'Disjoncteur AC']).nullable().optional(),
}).strict();

const additionalCostItemV1Schema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  quantity: z.number().finite().positive(),
  unitCostMinor: z.number().int().min(0),
  marginRatio: z.number().finite().min(0).max(1),
}).strict();

const ancillaryCostV1Schema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('absolute'), amountMinor: z.number().int().min(0) }).strict(),
  z.object({ mode: z.literal('ratio'), ratio: z.number().finite().min(0).max(1) }).strict(),
]);

export const costingInputV1Schema = z.object({
  useGlobalCost: z.boolean(),
  moduleUnitPriceMinor: z.number().int().min(0),
  moduleMarginRatio: z.number().finite().min(0).max(1),
  batteryUnitPriceMinor: z.number().int().min(0),
  batteryMarginRatio: z.number().finite().min(0).max(1),
  inverterUnitPriceMinor: z.number().int().min(0),
  inverterMarginRatio: z.number().finite().min(0).max(1),
  cabling: ancillaryCostV1Schema,
  electricalBox: ancillaryCostV1Schema,
  supports: ancillaryCostV1Schema,
  transport: ancillaryCostV1Schema,
  installation: ancillaryCostV1Schema,
  cablingMarginRatio: z.number().finite().min(0).max(1),
  electricalBoxMarginRatio: z.number().finite().min(0).max(1),
  supportsMarginRatio: z.number().finite().min(0).max(1),
  transportMarginRatio: z.number().finite().min(0).max(1),
  installationMarginRatio: z.number().finite().min(0).max(1),
  vatRatio: z.number().finite().min(0).max(1),
  discountRatio: z.number().finite().min(0).max(1),
  downPaymentRatio: z.number().finite().min(0).max(1),
  deliveryDays: z.number().int().min(0),
  offerValidityDays: z.number().int().min(0),
  productWarrantyMonths: z.number().int().min(0),
  additional: z.array(additionalCostItemV1Schema),
}).strict();

export const projectInputsV1Schema = z.object({
  schemaVersion: z.literal(1),
  details: projectDetailsInputV1Schema,
  site: siteInputV1Schema,
  load: loadInputV1Schema,
  assumptions: assumptionInputV1Schema,
  cableChoices: z.array(cableChoiceInputV1Schema),
  protectionChoices: z.array(protectionChoiceInputV1Schema),
  costing: costingInputV1Schema,
  currencyCode: z.string().regex(/^[A-Z]{3}$/),
}).strict();

export type ProjectInputsV1 = z.infer<typeof projectInputsV1Schema>;
export type ProjectDetailsInputV1 = z.infer<typeof projectDetailsInputV1Schema>;
export type SiteInputV1 = z.infer<typeof siteInputV1Schema>;
export type LoadInputV1 = z.infer<typeof loadInputV1Schema>;

export function parseProjectInputsV1(value: unknown): ProjectInputsV1 {
  return projectInputsV1Schema.parse(value);
}
