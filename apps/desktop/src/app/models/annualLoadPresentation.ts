import { buildAnnualLoadSeries, computeLocalHours, calculateAnnualYEn, type AnnualLoadSeries, type AnnualYEnResult } from '@ksd/engine';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from './projectView.js';
import { localHoursCache } from '../adapters/projectToAio.js';

export interface AnnualLoadPresentation {
  readonly series: AnnualLoadSeries;
  readonly yEn: AnnualYEnResult;
  readonly poaByTimestamp: ReadonlyMap<string, number>;
  readonly periods: readonly { id: string; name: string; startMonthDay: string; endMonthDay: string; displayColor?: string }[];
  readonly daily: readonly { readonly dateIso: string; readonly energyKwh: number; readonly peakKw: number }[];
}

/**
 * Pourquoi le tracé annuel n'a rien à montrer.
 *
 * Un `null` muet renvoyait toujours le même message — « en attente de la météo
 * horaire » — y compris quand la météo était bien chargée et que l'obstacle
 * était ailleurs. Le lecteur allait alors chercher au mauvais endroit.
 */
export type AnnualLoadUnavailable =
  | { readonly status: 'unavailable'; readonly reasonKey: string };

export type AnnualLoadPresentationResult =
  | ({ readonly status: 'ready' } & AnnualLoadPresentation)
  | AnnualLoadUnavailable;

const unavailable = (reasonKey: string): AnnualLoadUnavailable => ({ status: 'unavailable', reasonKey });

export function buildAnnualLoadPresentationResult(project: ProjectViewModel, solar: SolarResourceAnalysisOutputV1 | null): AnnualLoadPresentationResult {
  const resource = project.site.downloadedSource;
  if (solar === null || resource?.hourlyIrradiance === undefined) return unavailable('loads.annualNeedsWeather');
  if (resource.hourlyIrradiance.length !== solar.hourlyPoaWm2.length) return unavailable('loads.annualWeatherMismatch');
  const activeProfile = project.load.profiles.find((profile) => profile.id === project.load.activeProfileId);
  // The invoice workflow has its own sourced-profile/YEn adjustment and must
  // remain the authority for that mode until an explicit hourly profile is
  // declared. A zero-filled hourly editor must never mask that result.
  if (project.load.activeMode !== 'composed' && activeProfile?.source === 'meter') return unavailable('loads.annualMeterMode');
  const annualProfiles = project.load.activeMode === 'composed' && project.load.composition !== null
    ? project.load.composition.profiles.map((profile) => ({
      id: profile.id,
      hourlyEnergyWh: profile.hourly.map((point) => point.realPower * 1_000),
      hourlyPeakPowerW: profile.hourly.map((point) => point.peakPower * 1_000),
    }))
    : project.load.profiles.map((profile) => {
    // Journée type ou année importée : la série de la source, telle quelle.
    const direct = profile.source === 'annual' ? profile.annual ?? [] : profile.hourly;
    const equipmentProfile = profile.appliances.map((row) => ({
      id: row.id, label: row.name, quantity: row.qty, usefulPowerW: row.unitPower,
      efficiencyRatio: row.yield, hourlyOperatingFractions: row.operatingFractions,
      startupPowerMultiplier: row.startupCoef > 1 ? row.startupCoef : null,
    }));
    const hourlyEnergyWh = profile.source === 'equipments' && equipmentProfile.length > 0
      ? Array.from({ length: 24 }, (_, hour) => equipmentProfile.reduce((total, row) => total + row.usefulPowerW * row.quantity / (row.efficiencyRatio ?? 1) * row.hourlyOperatingFractions[hour]!, 0))
      : direct.map((point) => point.realPower * 1_000);
    const hourlyPeakPowerW = profile.source === 'equipments' && equipmentProfile.length > 0
      ? Array.from({ length: 24 }, (_, hour) => equipmentProfile.reduce((total, row) => {
        const running = row.usefulPowerW * row.quantity / (row.efficiencyRatio ?? 1) * row.hourlyOperatingFractions[hour]!;
        return Math.max(total, running * (row.startupPowerMultiplier ?? 1));
      }, 0))
      : direct.map((point) => (point.peakPower ?? point.realPower) * 1_000);
      return { id: profile.id, hourlyEnergyWh, hourlyPeakPowerW };
    });
  if (annualProfiles.length === 0) return unavailable('loads.annualNeedsProfile');
  // Sans fuseau, aucune heure locale n'est fiable : on ne suppose pas UTC.
  const timezone = project.site.timezoneIana;
  if (timezone === null) return unavailable('loads.annualNeedsWeather');
  const timestamps = resource.hourlyIrradiance.map((point) => point.timestampUtcIso);
  const weather = timestamps.map((timestamp, index) => ({ timestampUtcIso: timestamp, poaWm2: solar.hourlyPoaWm2[index]! }));
  try {
    const localHours = localHoursCache(`${resource.sourceSha256 ?? ''}|${timezone}`, () => computeLocalHours(timestamps, timezone));
    const series = buildAnnualLoadSeries({
      timezoneIana: timezone, weather, localHours, calendar: project.load.activeMode === 'composed' && project.load.composition !== null ? project.load.composition.calendar : project.load.calendar,
      profiles: annualProfiles,
    });
    const poaByTimestamp = new Map(weather.map((point) => [point.timestampUtcIso, point.poaWm2]));
    const yEn = calculateAnnualYEn({ series, poaByTimestamp, thresholdWm2: project.load.irMin });
    const byDate = new Map<string, { energyKwh: number; peakKw: number }>();
    for (const point of series.points) {
      const current = byDate.get(point.localDateIso) ?? { energyKwh: 0, peakKw: 0 };
      current.energyKwh += point.activeEnergyWh / 1_000;
      current.peakKw = Math.max(current.peakKw, point.peakPowerW / 1_000);
      byDate.set(point.localDateIso, current);
    }
    const activeCalendar = project.load.activeMode === 'composed' && project.load.composition !== null ? project.load.composition.calendar : project.load.calendar;
    return { status: 'ready', series, yEn, poaByTimestamp, periods: activeCalendar.periods, daily: [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([dateIso, values]) => ({ dateIso, ...values })) };
  } catch (error) {
    // Le motif du moteur est le seul indice utile ici ; l'effacer avait déjà
    // coûté un diagnostic complet sur un profil annuel refusé en silence.
    if (error instanceof Error) console.warn('[profil annuel] série non construite :', error.message);
    return unavailable('loads.annualBuildFailed');
  }
}

/** Ancienne forme, conservée pour les appelants qui ne lisent que le résultat. */
export function buildAnnualLoadPresentation(project: ProjectViewModel, solar: SolarResourceAnalysisOutputV1 | null): AnnualLoadPresentation | null {
  const result = buildAnnualLoadPresentationResult(project, solar);
  return result.status === 'ready' ? result : null;
}
