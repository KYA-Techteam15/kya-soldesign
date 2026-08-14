import type { AioSizingRequestV1, Locality, NormalizedHourlyProfile, Provenance, WeatherSource } from '@ksd/domain';
import { normalizeDirectHourlyRows, normalizeEquipmentRows, normalizeMeterReading, type LoadInputIssue, type LoadWarning } from '@ksd/engine';
import type { ProjectFileV1 } from '@ksd/project-format';
import { parseProjectInputsV1 } from '../models/projectInputs.js';

export type ProjectToAioResult =
  | { readonly status: 'ready'; readonly input: AioSizingRequestV1; readonly warnings: readonly LoadWarning[] }
  | { readonly status: 'blocked'; readonly issues: readonly LoadInputIssue[] };

export async function projectToAioInput(project: ProjectFileV1, references: {
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
}): Promise<ProjectToAioResult> {
  const input = parseProjectInputsV1(project.inputs);
  const profile = input.load.profiles.find((candidate) => candidate.id === input.load.activeProfileId)!;
  if (input.site.timezoneIana === null) return blocked('SITE_TIMEZONE_MISSING', 'site.timezoneIana', 'A project timezone is required to align the 24-hour load profile');

  const normalized = profile.source === 'equipment'
    ? normalizeEquipmentRows({ timezoneIana: input.site.timezoneIana, rows: profile.items.map((item) => ({
      id: item.id, label: item.label, quantity: item.quantity, usefulPowerW: item.usefulPowerW,
      efficiencyRatio: item.efficiencyRatio, simultaneityRatio: item.simultaneityRatio,
      hourlyOperatingFractions: item.hourlyOperatingFractions, startupPowerMultiplier: item.startupPowerMultiplier,
    })) })
    : profile.source === 'hourly'
      ? normalizeDirectHourlyRows({ timezoneIana: input.site.timezoneIana, hourlyPowerW: profile.hourlyPoints.map((point) => point.activePowerW), hourlyPeakPowerW: profile.hourlyPoints.map((point) => point.peakPowerW) })
      : normalizeMeterReading({
        timezoneIana: input.site.timezoneIana,
        observedEnergyWh: profile.meter?.observedEnergyWh ?? null,
        observedDays: profile.meter?.observedDays ?? null,
        profile: references.loadProfiles.find((candidate) => candidate.id === profile.meter?.normalizedProfileId) ?? null,
      });
  if (normalized.status === 'blocked') return normalized;

  const projectProvenance = await declaredProvenance('project-page1-input', project.id, input);
  const locality = references.localities.find((candidate) => candidate.id === input.site.localityId);
  const weatherSource = references.weatherSources.find((candidate) => candidate.id === input.site.weatherSourceId);
  const resource = input.site.solarResource;
  const designMonth = input.site.designMonth;
  const selectedPoa = designMonth === null ? null : resource?.monthlyPlaneOfArrayIrradiationKWhPerM2PerDay[designMonth - 1] ?? null;
  const resourceComplete = resource !== null
    && resource.datasetOrDocument.trim().length > 0
    && resource.versionOrDate.trim().length > 0
    && resource.locator.trim().length > 0
    && resource.retrievedAtIso.length > 0;
  const resourceIsFresh = resourceComplete
    && resource.weatherSourceId === input.site.weatherSourceId
    && resource.arrayTiltDeg === input.site.arrayTiltDeg
    && resource.arrayAzimuthDeg === input.site.arrayAzimuthDeg;
  const solarProvenance = !resourceComplete ? null : await declaredProvenance('user-declared-solar-resource', resource.locator, resource);

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
    ...(resourceIsFresh && designMonth !== null && selectedPoa !== null && selectedPoa > 0 && weatherSource !== undefined && solarProvenance !== null ? {
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
  return { status: 'ready', input: request, warnings: normalized.warnings };
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
