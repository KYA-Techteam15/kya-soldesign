import { buildAnnualLoadSeries, calculateAnnualYEn, type AnnualLoadSeries, type AnnualYEnResult } from '@ksd/engine';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from './projectView.js';

export interface AnnualLoadPresentation {
  readonly series: AnnualLoadSeries;
  readonly yEn: AnnualYEnResult;
  readonly poaByTimestamp: ReadonlyMap<string, number>;
  readonly periods: readonly { id: string; name: string; startMonthDay: string; endMonthDay: string; displayColor?: string }[];
  readonly daily: readonly { readonly dateIso: string; readonly energyKwh: number; readonly peakKw: number }[];
}

export function buildAnnualLoadPresentation(project: ProjectViewModel, solar: SolarResourceAnalysisOutputV1 | null): AnnualLoadPresentation | null {
  const resource = project.site.downloadedSource;
  if (solar === null || resource?.hourlyIrradiance === undefined || resource.hourlyIrradiance.length !== solar.hourlyPoaWm2.length) return null;
  const activeProfile = project.load.profiles.find((profile) => profile.id === project.load.activeProfileId);
  // The invoice workflow has its own sourced-profile/YEn adjustment and must
  // remain the authority for that mode until an explicit hourly profile is
  // declared. A zero-filled hourly editor must never mask that result.
  if (project.load.activeMode !== 'composed' && activeProfile?.source === 'meter') return null;
  const annualProfiles = project.load.activeMode === 'composed' && project.load.composition !== null
    ? project.load.composition.profiles.map((profile) => ({
      id: profile.id,
      hourlyEnergyWh: profile.hourly.map((point) => point.realPower * 1_000),
      hourlyPeakPowerW: profile.hourly.map((point) => point.peakPower * 1_000),
    }))
    : project.load.profiles.map((profile) => {
    const equipmentProfile = profile.classic.concat(profile.inductive).map((row) => ({
      id: row.id, label: row.name, quantity: row.qty, usefulPowerW: row.unitPower,
      efficiencyRatio: row.yield, simultaneityRatio: row.simultaneity, hourlyOperatingFractions: row.operatingFractions,
      startupPowerMultiplier: 'startupCoef' in row ? (row.startupCoef as number | null) : null,
    }));
    const hourlyEnergyWh = profile.source === 'equipments' && equipmentProfile.length > 0
      ? Array.from({ length: 24 }, (_, hour) => equipmentProfile.reduce((total, row) => total + row.usefulPowerW * row.quantity * (row.simultaneityRatio ?? 1) / (row.efficiencyRatio ?? 1) * row.hourlyOperatingFractions[hour]!, 0))
      : profile.hourly.map((point) => point.realPower * 1_000);
    const hourlyPeakPowerW = profile.source === 'equipments' && equipmentProfile.length > 0
      ? Array.from({ length: 24 }, (_, hour) => equipmentProfile.reduce((total, row) => {
        const running = row.usefulPowerW * row.quantity / (row.efficiencyRatio ?? 1) * row.hourlyOperatingFractions[hour]!;
        return Math.max(total, running * (row.startupPowerMultiplier ?? 1));
      }, 0))
      : profile.hourly.map((point) => point.peakPower * 1_000);
      return { id: profile.id, hourlyEnergyWh, hourlyPeakPowerW };
    });
  if (annualProfiles.length === 0) return null;
  const timestamps = resource.hourlyIrradiance.map((point) => point.timestampUtcIso);
  const weather = timestamps.map((timestamp, index) => ({ timestampUtcIso: timestamp, poaWm2: solar.hourlyPoaWm2[index]! }));
  try {
    const series = buildAnnualLoadSeries({
      timezoneIana: project.site.timezoneIana ?? 'UTC', weather, calendar: project.load.activeMode === 'composed' && project.load.composition !== null ? project.load.composition.calendar : project.load.calendar,
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
    return { series, yEn, poaByTimestamp, periods: activeCalendar.periods, daily: [...byDate.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([dateIso, values]) => ({ dateIso, ...values })) };
  } catch {
    return null;
  }
}
