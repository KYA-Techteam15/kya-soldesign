import type { AioSizingRequestV1, Locality, NormalizedHourlyProfile, Provenance, WeatherSource } from '@ksd/domain';
import { analyzeSolarResource, normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading, type LoadInputIssue, type LoadWarning, type Page1LoadNormalization, type SolarResourceAnalysisEnvelopeV1 } from '@ksd/engine';
import type { ProjectFileV1 } from '@ksd/project-format';
import { parseProjectInputsV1, type ProjectInputsV1 } from '../models/projectInputs.js';

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

  const normalized = normalizeActiveLoad(input, references);
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

/** Site can calculate the real solar resource before the user has entered a valid load; gamma then remains unavailable. */
export function projectToSolarAnalysis(project: ProjectFileV1, references: Page1References): SolarResourceAnalysisEnvelopeV1 | null {
  const input = parseProjectInputsV1(project.inputs);
  return analyzeProjectSolar(input, normalizeActiveLoad(input, references));
}

function normalizeActiveLoad(input: ProjectInputsV1, references: Page1References): Page1LoadNormalization {
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
      : normalizeMeterReading({ timezoneIana: input.site.timezoneIana, observedEnergyWh: profile.meter?.observedEnergyWh ?? null, observedDays: profile.meter?.observedDays ?? null, profile: references.loadProfiles.find((candidate) => candidate.id === profile.meter?.normalizedProfileId) ?? null });
}

function analyzeProjectSolar(input: ProjectInputsV1, normalization: Page1LoadNormalization): SolarResourceAnalysisEnvelopeV1 | null {
  const resource = input.site.solarResource;
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!;
  if (resource === null || resource.datasetOrDocument.trim().length === 0 || resource.versionOrDate.trim().length === 0 || resource.locator.trim().length === 0 || resource.retrievedAtIso.length === 0
    || resource.weatherFileId === undefined || resource.sourceSha256 === undefined || resource.timezoneOffsetMinutes === undefined || resource.albedo === undefined || resource.hourlyIrradiance === undefined
    || input.site.latitudeDeg === null || input.site.longitudeDeg === null || input.site.arrayTiltDeg === null || input.site.arrayAzimuthDeg === null) return null;
  const provenance: Provenance = { sourceId: resource.weatherFileId, sourceRecordId: resource.locator, sourceSha256: resource.sourceSha256, transformationVersion: '1.1.0' };
  const load = normalization.status === 'ready' ? normalization.load : null;
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
