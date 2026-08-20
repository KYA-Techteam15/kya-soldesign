import type { AioSizingRequestV1, Locality, NormalizedHourlyProfile, Provenance, WeatherSource } from '@ksd/domain';
import { adjustHourlyFractionsToGamma, analyzeSolarResource, normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading, type LoadInputIssue, type LoadWarning, type Page1LoadNormalization, type PresizingInputV1, type SolarResourceAnalysisEnvelopeV1 } from '@ksd/engine';
import type { ProjectFileV1 } from '@ksd/project-format';
import { parseProjectInputsV1, type ProjectInputsV1 } from '../models/projectInputs.js';
import { PRESIZING_DEFAULTS } from '../models/projectAdapters.js';

interface Page1References {
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
}

export type ProjectToAioResult =
  | { readonly status: 'ready'; readonly input: AioSizingRequestV1; readonly warnings: readonly LoadWarning[]; readonly solarAnalysis: SolarResourceAnalysisEnvelopeV1 | null }
  | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] };

export async function projectToAioInput(project: ProjectFileV1, references: Page1References): Promise<ProjectToAioResult> {
  const input = parseProjectInputsV1(project.inputs);
  if (input.site.timezoneIana === null) return blocked('SITE_TIMEZONE_MISSING', 'site.timezoneIana', 'A project timezone is required to align the 24-hour load profile');

  const resourceOnly = analyzeProjectSolar(input, null);
  const normalized = normalizeActiveLoad(input, references, resourceOnly?.output.meanHourlyPoaWm2 ?? null);
  if (normalized.status === 'blocked') return normalized;

  const projectProvenance = await declaredProvenance('project-page1-input', project.id, input);
  const locality = references.localities.find((candidate) => candidate.id === input.site.localityId);
  const weatherSource = references.weatherSources.find((candidate) => candidate.id === input.site.weatherSourceId);
  const resource = input.site.solarResource;
  const solarAnalysis = analyzeProjectSolar(input, normalized);
  const solarProvenance = solarAnalysis?.provenance[0] ?? null;
  const designMonth = input.site.designMonth;
  const selectedPoa = designMonth === null ? null : solarAnalysis?.output.monthlyAverageDailyPoaKWhM2Day[designMonth - 1] ?? null;

  const request: AioSizingRequestV1 = {
    schemaVersion: 1,
    technicalContext: {
      applicationType: input.details.applicationType,
      site: {
        ...(locality === undefined ? {} : { localityId: locality.id }),
        ...(input.site.latitudeDeg === null ? {} : { latitudeDeg: input.site.latitudeDeg }),
        ...(input.site.longitudeDeg === null ? {} : { longitudeDeg: input.site.longitudeDeg }),
        ...(input.site.arrayTiltDeg === null ? {} : { arrayTiltDeg: input.site.arrayTiltDeg }),
        ...(input.site.arrayAzimuthDeg === null ? {} : { arrayAzimuthDeg: input.site.arrayAzimuthDeg }),
      },
    },
    load: normalized.load,
    ...(solarAnalysis !== null && designMonth !== null && selectedPoa !== null && selectedPoa > 0 && resource !== null && solarProvenance !== null ? {
      solarDesignResource: {
        selectionMethod: 'declared-critical-month' as const,
        referencePeriod: { yearOrTypicalPeriod: resource.versionOrDate, month: designMonth },
        planeOfArrayIrradiationKWhPerM2PerDay: selectedPoa,
        arrayTiltDeg: resource.arrayTiltDeg,
        arrayAzimuthDeg: resource.arrayAzimuthDeg,
        source: {
          provider: resource.provider,
          datasetOrDocument: resource.datasetOrDocument,
          versionOrDate: resource.versionOrDate,
          locator: resource.locator,
          retrievedAtIso: resource.retrievedAtIso,
        },
        timeConvention: { timezoneIana: input.site.timezoneIana, timestampConvention: 'interval-center' as const, intervalMinutes: 60 },
        qualityFlags: resource.qualityFlags,
        provenance: solarProvenance,
      },
    } : {}),
    assumptions: { batteryChemistry: 'unknown', assumptionSources: [] },
    provenance: [projectProvenance, ...(locality === undefined ? [] : [locality.provenance]), ...(weatherSource === undefined ? [] : [weatherSource.provenance]), ...(solarProvenance === null ? [] : [solarProvenance])],
  };
  return { status: 'ready', input: request, warnings: normalized.warnings, solarAnalysis };
}

export async function projectToPresizingInput(project: ProjectFileV1, references: Page1References): Promise<{ readonly status: 'ready'; readonly input: PresizingInputV1 } | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] }> {
  const adapted = await projectToAioInput(project, references);
  if (adapted.status === 'blocked') return adapted;
  const solar = adapted.solarAnalysis;
  if (solar === null) return { status: 'blocked', issues: [{ code: 'WEATHER_FILE_MISSING', path: 'site.solarResource', message: 'Local hourly weather data is required' }] };
  if (solar.output.gamma.status !== 'available') return { status: 'blocked', issues: [{ code: 'YEN_UNAVAILABLE', path: 'load.activeProfileId', message: 'YEn requires a non-zero active load profile' }] };
  const storedAssumptions = parseProjectInputsV1(project.inputs).assumptions;
  const assumptions = {
    ...storedAssumptions,
    maxLpspRatio: storedAssumptions.maxLpspRatio ?? PRESIZING_DEFAULTS.maxLpspRatio,
    maxLolpRatio: storedAssumptions.maxLolpRatio ?? PRESIZING_DEFAULTS.maxLolpRatio,
    systemPerformanceRatio: storedAssumptions.systemPerformanceRatio ?? PRESIZING_DEFAULTS.systemPerformanceRatio,
    inverterEfficiencyRatio: storedAssumptions.inverterEfficiencyRatio ?? PRESIZING_DEFAULTS.inverterEfficiencyRatio,
    batteryEfficiencyRatio: storedAssumptions.batteryEfficiencyRatio ?? PRESIZING_DEFAULTS.batteryEfficiencyRatio,
    pvSpecificCostMinorPerKw: storedAssumptions.pvSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.pvSpecificCostMinorPerKw,
    pvMarginRatio: storedAssumptions.pvMarginRatio ?? PRESIZING_DEFAULTS.pvMarginRatio,
    batterySpecificCostMinorPerKwh: storedAssumptions.batterySpecificCostMinorPerKwh ?? PRESIZING_DEFAULTS.batterySpecificCostMinorPerKwh,
    batteryMarginRatio: storedAssumptions.batteryMarginRatio ?? PRESIZING_DEFAULTS.batteryMarginRatio,
    inverterSpecificCostMinorPerKw: storedAssumptions.inverterSpecificCostMinorPerKw ?? PRESIZING_DEFAULTS.inverterSpecificCostMinorPerKw,
    inverterMarginRatio: storedAssumptions.inverterMarginRatio ?? PRESIZING_DEFAULTS.inverterMarginRatio,
    gridTariffMinorPerKwh: storedAssumptions.gridTariffMinorPerKwh ?? PRESIZING_DEFAULTS.gridTariffMinorPerKwh,
    gridEmissionKgCo2PerKwh: storedAssumptions.gridEmissionKgCo2PerKwh ?? PRESIZING_DEFAULTS.gridEmissionKgCo2PerKwh,
  };
  const required = {
    lpspMax: assumptions.maxLpspRatio, lolpMax: assumptions.maxLolpRatio, systemPr: assumptions.systemPerformanceRatio,
    inverterEfficiency: assumptions.inverterEfficiencyRatio, batteryEfficiency: assumptions.batteryEfficiencyRatio,
    pvCost: assumptions.pvSpecificCostMinorPerKw, batteryCost: assumptions.batterySpecificCostMinorPerKwh,
    inverterCost: assumptions.inverterSpecificCostMinorPerKw, tariff: assumptions.gridTariffMinorPerKwh, emission: assumptions.gridEmissionKgCo2PerKwh,
  };
  const missing = Object.entries(required).filter(([, value]) => value === null).map(([key]) => key);
  if (missing.length > 0) return { status: 'blocked', issues: [{ code: 'PRESIZING_ASSUMPTIONS_MISSING', path: `assumptions.${missing.join(',')}`, message: 'All pre-sizing assumptions are required' }] };
  const value = required as { readonly [Key in keyof typeof required]: number };
  const load = adapted.input.load;
  const peakPowerW = solar.output.loadHourlyPeakPowerW === null ? Math.max(...load.hourlyEnergyWh) : Math.max(...solar.output.loadHourlyPeakPowerW);
  return { status: 'ready', input: {
    dailyEnergyWh: load.hourlyEnergyWh.reduce((sum, item) => sum + item, 0), yEn: solar.output.gamma.value, hourlyLoadWh: load.hourlyEnergyWh,
    hourlyPoaWm2: solar.output.hourlyPoaWm2, peakPowerW, lpspMax: value.lpspMax, lolpMax: value.lolpMax, systemPr: value.systemPr,
    inverterEfficiency: value.inverterEfficiency, batteryEfficiency: value.batteryEfficiency,
    pvSpecificCostPerKw: value.pvCost * (1 + assumptions.pvMarginRatio),
    batterySpecificCostPerKwh: value.batteryCost * (1 + assumptions.batteryMarginRatio),
    inverterSpecificCostPerKw: value.inverterCost * (1 + assumptions.inverterMarginRatio),
    gridTariffPerKwh: value.tariff, emissionFactorKgPerKwh: value.emission,
    projectLifetimeYears: assumptions.projectLifetimeYears ?? PRESIZING_DEFAULTS.projectLifetimeYears,
    pvLifetimeYears: assumptions.pvLifetimeYears ?? PRESIZING_DEFAULTS.pvLifetimeYears,
    batteryLifetimeYears: assumptions.batteryLifetimeYears ?? PRESIZING_DEFAULTS.batteryLifetimeYears,
    inverterLifetimeYears: assumptions.inverterLifetimeYears ?? PRESIZING_DEFAULTS.inverterLifetimeYears,
    pvMaintenanceRatioPerYear: assumptions.pvMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.pvMaintenanceRatioPerYear,
    batteryMaintenanceRatioPerYear: assumptions.batteryMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.batteryMaintenanceRatioPerYear,
    inverterMaintenanceRatioPerYear: assumptions.inverterMaintenanceRatioPerYear ?? PRESIZING_DEFAULTS.inverterMaintenanceRatioPerYear,
    discountRateRatio: assumptions.discountRateRatio ?? PRESIZING_DEFAULTS.discountRateRatio,
  } };
}

/** Site can calculate the real solar resource before the user has entered a valid load; gamma then remains unavailable. */
export function projectToSolarAnalysis(project: ProjectFileV1, references: Page1References): SolarResourceAnalysisEnvelopeV1 | null {
  const input = parseProjectInputsV1(project.inputs);
  const resourceOnly = analyzeProjectSolar(input, null);
  return analyzeProjectSolar(input, normalizeActiveLoad(input, references, resourceOnly?.output.meanHourlyPoaWm2 ?? null));
}

function normalizeActiveLoad(input: ProjectInputsV1, references: Page1References, meanHourlyPoaWm2: readonly number[] | null): Page1LoadNormalization {
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!;
  if (input.site.timezoneIana === null) return { status: 'blocked', issues: [{ code: 'SITE_TIMEZONE_MISSING', path: 'site.timezoneIana', message: 'A project timezone is required' }] };
  return profile.source === 'equipment'
    ? normalizeEquipmentRows({ timezoneIana: input.site.timezoneIana, rows: profile.items.map((item) => ({
      id: item.id, label: item.label, quantity: item.quantity, usefulPowerW: item.usefulPowerW,
      efficiencyRatio: item.efficiencyRatio, simultaneityRatio: item.simultaneityRatio,
      hourlyOperatingFractions: item.hourlyOperatingFractions, startupPowerMultiplier: item.startupPowerMultiplier,
    })) })
    : profile.source === 'hourly'
      ? normalizeDirectHourlyRows({ timezoneIana: input.site.timezoneIana, hourlyPowerW: profile.hourlyPoints.map((point) => point.activePowerW), hourlyPeakPowerW: profile.hourlyPoints.map((point) => point.peakPowerW) })
      : normalizeMeterLoad(input, references, meanHourlyPoaWm2);
}

function normalizeMeterLoad(input: ProjectInputsV1, references: Page1References, meanHourlyPoaWm2: readonly number[] | null): Page1LoadNormalization {
  const meter = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!.meter;
  const sourceProfile = references.loadProfiles.find((candidate) => candidate.id === meter?.normalizedProfileId) ?? null;
  let adjustedFractions: readonly number[] | undefined;
  if (meter?.forceYEn) {
    if (sourceProfile === null || meter.targetYEn === null) return { status: 'blocked', issues: [{ code: 'YEN_TARGET_MISSING', path: 'meter.targetYEn', message: 'A sourced profile and a YEn target are required' }] };
    if (meanHourlyPoaWm2 === null) return { status: 'blocked', issues: [{ code: 'YEN_WEATHER_MISSING', path: 'site.solarResource', message: 'Local weather data is required to force YEn' }] };
    const adjustment = adjustHourlyFractionsToGamma({ hourlyEnergyFractions: sourceProfile.hourlyEnergyFractions, meanHourlyPoaWm2, thresholdWm2: input.load.minimumOperatingIrradianceWPerM2 ?? 10, targetGamma: meter.targetYEn });
    if (adjustment.status === 'blocked') return { status: 'blocked', issues: [{ code: adjustment.code, path: 'meter.targetYEn', message: adjustment.message }] };
    adjustedFractions = adjustment.hourlyEnergyFractions;
  }
  const normalized = normalizeMeterReading({ timezoneIana: input.site.timezoneIana!, observedEnergyWh: meter?.observedEnergyWh ?? null, observedDays: meter?.observedDays ?? null, profile: sourceProfile, ...(adjustedFractions === undefined ? {} : { hourlyEnergyFractions: adjustedFractions }) });
  if (normalized.status === 'blocked' || adjustedFractions === undefined) return normalized;
  return { ...normalized, warnings: [...normalized.warnings, { code: 'LOAD_METER_YEN_ADJUSTED', message: 'The sourced hourly profile was adjusted to the declared YEn target using local weather data' }] };
}

function analyzeProjectSolar(input: ProjectInputsV1, normalization: Page1LoadNormalization | null): SolarResourceAnalysisEnvelopeV1 | null {
  const resource = input.site.solarResource;
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!;
  if (resource === null || resource.datasetOrDocument.trim().length === 0 || resource.versionOrDate.trim().length === 0 || resource.locator.trim().length === 0 || resource.retrievedAtIso.length === 0
    || resource.weatherFileId === undefined || resource.sourceSha256 === undefined || resource.timezoneOffsetMinutes === undefined || resource.albedo === undefined || resource.hourlyIrradiance === undefined
    || input.site.latitudeDeg === null || input.site.longitudeDeg === null || input.site.arrayTiltDeg === null || input.site.arrayAzimuthDeg === null) return null;
  const provenance: Provenance = { sourceId: resource.weatherFileId, sourceRecordId: resource.locator, sourceSha256: resource.sourceSha256, transformationVersion: '1.1.0' };
  const load = normalization?.status === 'ready' ? normalization.load : null;
  const peak = load === null ? null : deriveHourlyPeakPower(profile.source, profile.hourlyPoints.map((point) => point.peakPowerW), load.hourlyEnergyWh, load.startupEvents);
  return analyzeSolarResource({
    latitudeDeg: input.site.latitudeDeg, longitudeDeg: input.site.longitudeDeg,
    surfaceTiltDeg: input.site.arrayTiltDeg, surfaceAzimuthDeg: input.site.arrayAzimuthDeg,
    albedo: resource.albedo, intervalMinutes: 60, timestampConvention: 'interval-center', timezoneOffsetMinutes: resource.timezoneOffsetMinutes,
    observations: resource.hourlyIrradiance,
    ...(load === null ? {} : { loadHourlyEnergyWh: load.hourlyEnergyWh }),
    ...(peak === null ? {} : { loadHourlyPeakPowerW: peak }),
    minimumOperationalIrradianceWm2: input.load.minimumOperatingIrradianceWPerM2 ?? 10,
    provenance,
  });
}

async function declaredProvenance(sourceId: string, sourceRecordId: string, value: unknown): Promise<Provenance> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const sourceSha256 = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return { sourceId, sourceRecordId, sourceSha256, transformationVersion: '1.0.0' };
}

function blocked(code: string, path: string, message: string): ProjectToAioResult {
  return { status: 'blocked', issues: [{ code, path, message }] };
}

function deriveHourlyPeakPower(
  source: 'equipment' | 'hourly' | 'meter',
  directPeaks: readonly (number | null)[],
  hourlyMeanPowerW: readonly number[],
  startupEvents: readonly { readonly hourIndex: number; readonly runningPowerW: number; readonly startupPowerMultiplier: number | null }[],
): number[] | null {
  if (source === 'meter') return null;
  if (source === 'hourly') return directPeaks.map((value, hour) => value ?? hourlyMeanPowerW[hour]!);
  const peaks = [...hourlyMeanPowerW];
  for (const event of startupEvents) {
    if (event.startupPowerMultiplier === null) continue;
    const increment = event.runningPowerW * (event.startupPowerMultiplier - 1);
    peaks[event.hourIndex] = peaks[event.hourIndex]! + increment;
  }
  return peaks;
}
