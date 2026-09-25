import { describe, expect, it } from 'vitest';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import type { ProjectViewModel } from '../../src/app/models/projectView.js';
import { projectToAioInput, projectToPresizingInput } from '../../src/app/adapters/projectToAio.js';
import { canonicalWeatherFileToProjectPayload } from '../../src/app/adapters/weatherFiles.js';

/**
 * y_En se calcule sur l'année, avec la météo heure par heure (formule générique) :
 *   y_En = Σ énergie consommée aux heures où l'éclairement dépasse le seuil ÷ Σ énergie de l'année.
 * Une année composée l'applique à son calendrier ; une journée type, à ses mêmes données répétées
 * chaque jour.
 */
const THRESHOLD_WM2 = 10;
/** Journée de bureau : 1 kW de 8 h à 18 h, 200 W la nuit. */
const officeDay = Array.from({ length: 24 }, (_, hour) => (hour >= 8 && hour < 18 ? 1 : 0.2));
/** Journée de nuit : 1,5 kW de 18 h à 6 h, 100 W le jour ; pointe de 4 kW à 20 h. */
const nightDay = Array.from({ length: 24 }, (_, hour) => (hour >= 18 || hour < 6 ? 1.5 : 0.1));

async function projectWithWeather(seed: string) {
  const projects = new InMemoryProjects(() => '2026-09-25T08:00:00.000Z', () => `00000000-0000-4000-8000-${seed}`);
  const catalog = new CanonicalCatalog();
  const weatherFile = (await catalog.listWeatherFiles())[0]!;
  const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
  view.site.latitude = weatherFile.document.inputs.location.latitude;
  view.site.longitude = weatherFile.document.inputs.location.longitude;
  view.site.tilt = 15;
  view.site.azimuth = 180;
  // Lomé est à UTC+0 sans heure d'été : l'heure locale d'un relevé est son heure UTC.
  view.site.timezoneIana = 'Africa/Lome';
  view.site.weatherSourceId = 'pvgis-import:bombouaka';
  view.site.downloadedSource = {
    name: 'Import UTC', provider: 'PVGIS', versionOrDate: 'TMY 2005–2023', locator: 'import://bombouaka.json',
    retrievedAtIso: weatherFile.metadata.retrievedAtIso, qualityFlags: ['pvgis-hourly-file-verified'],
    ...canonicalWeatherFileToProjectPayload(weatherFile), timezoneOffsetMinutes: 0,
  };
  const references = { localities: await catalog.listLocalities(), weatherSources: await catalog.listWeatherSources(), loadProfiles: await catalog.listLoadProfiles() };
  return { projects, view, references };
}

/** Formule générique, calculée à la main sur les 8 760 heures : la référence du test. */
function annualYEn(poa: readonly number[], timestamps: readonly string[], loadAt: (timestampUtcIso: string) => number): number {
  let total = 0;
  let favorable = 0;
  timestamps.forEach((timestamp, index) => {
    const energy = loadAt(timestamp);
    total += energy;
    if (poa[index]! >= THRESHOLD_WM2) favorable += energy;
  });
  return favorable / total;
}

async function solarSeries(projects: InMemoryProjects, view: ProjectViewModel, references: Awaited<ReturnType<typeof projectWithWeather>>['references']) {
  const adapted = await projectToAioInput(projects.get(view.id)!, references);
  if (adapted.status === 'blocked' || adapted.solarAnalysis === null) throw new Error('solar analysis unavailable');
  const timestamps = view.site.downloadedSource!.hourlyIrradiance!.map((point) => point.timestampUtcIso);
  return { poa: adapted.solarAnalysis.output.hourlyPoaWm2, timestamps, output: adapted.solarAnalysis.output };
}

describe('y_En annuel (formule générique)', () => {
  it('répète la journée type sur l’année, même si le calendrier enregistré désigne un autre profil', async () => {
    const { projects, view, references } = await projectWithWeather('000000000301');
    view.load.activeMode = 'simple';
    view.load.profiles[0]!.source = 'hourly';
    view.load.profiles[0]!.hourly = officeDay.map((power, hour) => ({ hour, realPower: power, peakPower: null }));
    // Calendrier hérité qui ne connaît pas la source active : il ne doit plus faire tomber y_En.
    view.load.calendar = { ...view.load.calendar, assignments: view.load.calendar.assignments.map((item) => ({ ...item, profileId: 'profil-disparu' })) };
    projects.replace(projectViewToFile(view));

    const { poa, timestamps } = await solarSeries(projects, view, references);
    const expected = annualYEn(poa, timestamps, (timestamp) => officeDay[new Date(timestamp).getUTCHours()]! * 1000);

    const presizing = await projectToPresizingInput(projects.get(view.id)!, references);
    expect(presizing.status).toBe('ready');
    if (presizing.status !== 'ready') return;
    expect(presizing.input.yEn).toBeCloseTo(expected, 6);
  });

  it('applique le calendrier d’une année composée, avec la plus forte pointe de ses profils', async () => {
    const { projects, view, references } = await projectWithWeather('000000000302');
    view.load.activeMode = 'composed';
    view.load.composition = {
      organization: 'workweek-weekend',
      calendar: {
        version: 2,
        mode: 'workweek-weekend',
        dayGroups: [{ id: 'workweek', kind: 'workweek', weekdaysIso: [1, 2, 3, 4, 5] }, { id: 'weekend', kind: 'weekend', weekdaysIso: [6, 7] }],
        periods: [{ id: 'annual', name: 'Année', startMonthDay: '01-01', endMonthDay: '12-31' }],
        assignments: [
          { periodId: 'annual', dayGroupId: 'workweek', profileId: 'office' },
          { periodId: 'annual', dayGroupId: 'weekend', profileId: 'night' },
        ],
      },
      profiles: [
        { id: 'office', name: 'Jours ouvrés', color: '#f99d32', hourly: officeDay.map((power, hour) => ({ hour, realPower: power, peakPower: power })) },
        { id: 'night', name: 'Week-end', color: '#1ca18c', hourly: nightDay.map((power, hour) => ({ hour, realPower: power, peakPower: hour === 20 ? 4 : power })) },
      ],
    };
    projects.replace(projectViewToFile(view));

    const { output } = await solarSeries(projects, view, references);
    const presizing = await projectToPresizingInput(projects.get(view.id)!, references);
    expect(presizing.status).toBe('ready');
    if (presizing.status !== 'ready') return;

    // y_En vient du calcul annuel sur le calendrier, pas de la journée moyenne.
    expect(output.annualGamma?.status).toBe('available');
    if (output.annualGamma?.status !== 'available') return;
    expect(presizing.input.yEn).toBeCloseTo(output.annualGamma.annualGammaRatio, 9);
    // Un y_En pondéré par l'énergie : entre celui du profil de nuit et celui du profil de bureau.
    const byProfile = (day: readonly number[]) => annualYEn(output.hourlyPoaWm2, view.site.downloadedSource!.hourlyIrradiance!.map((point) => point.timestampUtcIso), (timestamp) => day[new Date(timestamp).getUTCHours()]!);
    expect(presizing.input.yEn).toBeGreaterThan(byProfile(nightDay));
    expect(presizing.input.yEn).toBeLessThan(byProfile(officeDay));
    // L'onduleur tient la pointe du week-end (4 kW), même si le premier profil est celui des jours ouvrés.
    expect(presizing.input.peakPowerW).toBeCloseTo(4_000, 6);
  });
});
