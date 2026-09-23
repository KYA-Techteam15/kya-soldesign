import { describe, expect, it } from 'vitest';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { canonicalWeatherFileToProjectPayload } from '../../src/app/adapters/weatherFiles.js';
import { buildAnnualLoadPresentation } from '../../src/app/models/annualLoadPresentation.js';
import { countryName } from '../../src/app/models/catalogView.js';

/**
 * Choisir une localité doit suffire.
 *
 * Le tracé annuel croise la charge et l'irradiance : sans les 8 760 heures de
 * météo, il n'a rien à croiser et le dit. Ce que l'écran ne dit pas, c'est que
 * la série peut déjà être dans la base — auquel cas choisir la localité la
 * charge, sans aucun téléchargement. Ces cas fixent les deux issues.
 */
describe('localité et tracé annuel', () => {
  /** Reproduit ce que fait le clic sur une localité dans « Choix du site ». */
  async function selectLocality(catalog: CanonicalCatalog, projects: InMemoryProjects, localityName: string) {
    const localities = await catalog.listLocalities();
    const sources = await catalog.listWeatherSources();
    const files = await catalog.listWeatherFiles();
    const locality = localities.find((item) => item.name === localityName)!;
    const source = sources.find((item) => item.localityId === locality.id) ?? null;
    const file = files.find((item) => item.metadata.weatherSourceId === source?.id) ?? null;

    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.site.localityId = locality.id;
    view.site.region = locality.name;
    view.site.countryCode = locality.countryCode;
    view.site.country = countryName(locality.countryCode, 'fr');
    view.site.latitude = locality.latitudeDeg;
    view.site.longitude = locality.longitudeDeg;
    view.site.timezoneIana = locality.timezone ?? 'Africa/Lome';
    view.site.weatherSourceId = source?.id ?? null;
    if (source && file) {
      const payload = canonicalWeatherFileToProjectPayload(file);
      view.site.tilt = source.defaultTiltDeg ?? 15;
      view.site.azimuth = source.defaultAzimuthDeg ?? 180;
      view.site.downloadedSource = {
        name: source.sourceName, provider: source.provider,
        versionOrDate: `TMY ${file.metadata.yearMin}–${file.metadata.yearMax}`,
        locator: file.metadata.relativePath, retrievedAtIso: file.metadata.retrievedAtIso,
        qualityFlags: ['pvgis-hourly-file-verified'],
        ...payload, hourlyIrradiance: [...payload.hourlyIrradiance],
      };
    }
    // Une charge horaire annuelle : c'est elle que le tracé doit reporter.
    view.load.profiles[0]!.source = 'hourly';
    view.load.profiles[0]!.hourly = Array.from({ length: 8_760 }, (_, hour) => ({
      hour, realPower: 1 + (hour % 24) / 24, peakPower: 3,
    }));
    projects.replace(projectViewToFile(view));
    return view;
  }

  const calculationsFor = async (catalog: CanonicalCatalog, projects: InMemoryProjects) =>
    new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(),
      weatherSources: await catalog.listWeatherSources(),
      loadProfiles: await catalog.listLoadProfiles(),
    });

  it('charge la série horaire de la base au choix de la localité, sans téléchargement', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000301');
    const catalog = new CanonicalCatalog();
    const view = await selectLocality(catalog, projects, 'Bombouaka');

    // Aucun appel réseau : la série vient du catalogue livré avec l'application.
    expect(view.site.downloadedSource?.hourlyIrradiance).toHaveLength(8_760);

    const calculations = await calculationsFor(catalog, projects);
    const solar = await calculations.read<SolarResourceAnalysisOutputV1>(view.id, 'solar-resource');
    expect(solar.status).toBe('ready');
    if (solar.status !== 'ready') return;

    // Le tracé annuel est alimenté : plus d'attente affichée à l'écran.
    const presentation = buildAnnualLoadPresentation(view, solar.envelope.output);
    expect(presentation).not.toBeNull();
    expect(presentation!.series.points).toHaveLength(8_760);
    expect(presentation!.daily).toHaveLength(365);
  });

  it('reste en attente pour une localité que la base ne couvre pas', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000302');
    const catalog = new CanonicalCatalog();
    const view = await selectLocality(catalog, projects, 'Ouagadougou');

    // Le message affiché est alors exact : il manque bien la météo horaire.
    expect(view.site.downloadedSource).toBeNull();
    expect(buildAnnualLoadPresentation(view, null)).toBeNull();
  });

  it('ne couvre aujourd’hui qu’une seule des localités livrées', async () => {
    const catalog = new CanonicalCatalog();
    const localities = await catalog.listLocalities();
    const sources = await catalog.listWeatherSources();
    const files = await catalog.listWeatherFiles();
    const covered = localities.filter((locality) => {
      const source = sources.find((item) => item.localityId === locality.id);
      return source !== undefined && files.some((file) => file.metadata.weatherSourceId === source.id);
    });
    // Ce chiffre est la vraie limite de l'automatisme : le jour où d'autres
    // fichiers entrent dans la base, il doit monter, et ce cas le signalera.
    expect(covered.map((item) => item.name)).toEqual(['Bombouaka']);
    expect(localities.length).toBeGreaterThan(covered.length);
  });
});
