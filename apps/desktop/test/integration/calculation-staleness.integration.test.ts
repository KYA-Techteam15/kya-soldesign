import { beforeAll, describe, expect, it } from 'vitest';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { canonicalWeatherFileToProjectPayload } from '../../src/app/adapters/weatherFiles.js';
import type { ProjectView } from '../../src/app/models/projectView.js';

/**
 * Le système retenu est dimensionné pour les besoins du prédimensionnement : si les
 * besoins changent, dimensionnement et chiffrage deviennent périmés, et les documents
 * sont bloqués (specs/010-release-readiness).
 */
describe('calculation staleness propagation', () => {
  const projects = new InMemoryProjects();
  let calc: AioCalculations;
  let projectId = '';

  beforeAll(async () => {
    const catalog = new CanonicalCatalog();
    const [localities, weatherSources, loadProfiles, weatherFiles, equipment] = await Promise.all([catalog.listLocalities(), catalog.listWeatherSources(), catalog.listLoadProfiles(), catalog.listWeatherFiles(), catalog.list()]);
    const references = { localities, weatherSources, loadProfiles, equipment };
    const locality = localities.find((candidate) => weatherSources.some((source) => source.localityId === candidate.id))!;
    const source = weatherSources.find((candidate) => candidate.localityId === locality.id)!;
    const file = weatherFiles.find((candidate) => candidate.metadata.weatherSourceId === source.id)!;
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.load.profiles[0]!.appliances.push({ id: 'l', name: 'L', qty: 10, unitPower: 150, yield: 1, operatingFractions: Array.from({ length: 24 }, (_, hour) => (hour >= 8 && hour < 16 ? 1 : 0)), opHours: 8, startupCoef: 1, inductive: false });
    Object.assign(view.site, { localityId: locality.id, latitude: locality.latitudeDeg, longitude: locality.longitudeDeg, timezoneIana: file.metadata.timezoneIana, weatherSourceId: source.id, tilt: 15, azimuth: 180 });
    view.site.downloadedSource = { name: 'x', provider: 'PVGIS', versionOrDate: 'x', locator: 'x', retrievedAtIso: file.metadata.retrievedAtIso, qualityFlags: [], ...canonicalWeatherFileToProjectPayload(file) };
    view.selection.moduleId = equipment.find((item) => item.kind === 'pv-module')!.id;
    view.selection.batteryId = equipment.find((item) => item.kind === 'battery')!.id;
    projects.replace(projectViewToFile(view));
    projectId = view.id;
    calc = new AioCalculations((id) => projects.get(id), references, (project) => projects.replace(project));

    await calc.runPresizing(projectId, () => undefined);
    const [inverter] = await calc.compatibleInverters(projectId);
    const withInverter = projectFileToView(projects.get(projectId)!);
    withInverter.selection.inverterId = inverter!.inverterId;
    projects.replace(projectViewToFile(withInverter));
    await calc.runSizing(projectId, () => undefined);
  });

  const edit = (change: (view: ProjectView) => void) => {
    const view = projectFileToView(projects.get(projectId)!);
    change(view);
    projects.replace(projectViewToFile(view));
  };

  it('starts from a current sizing and finance', async () => {
    expect((await calc.read(projectId, 'sizing')).status).toBe('ready');
    expect((await calc.read(projectId, 'finance')).status).toBe('ready');
  });

  it('marks sizing and finance stale once the loads change after the presizing', async () => {
    edit((view) => { view.load.profiles[0]!.appliances[0]!.qty = 30; });
    expect(await calc.read(projectId, 'presizing')).toMatchObject({ status: 'stale' });
    expect(await calc.read(projectId, 'sizing')).toMatchObject({ status: 'stale', reasonKey: 'state.presizingStale' });
    expect(await calc.read(projectId, 'finance')).toMatchObject({ status: 'stale' });
  });

  it('becomes current again when the loads come back to the calculated value', async () => {
    edit((view) => { view.load.profiles[0]!.appliances[0]!.qty = 10; });
    expect((await calc.read(projectId, 'sizing')).status).toBe('ready');
  });
});
