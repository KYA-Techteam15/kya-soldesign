import { beforeAll, describe, expect, it } from 'vitest';
import type { Equipment } from '@ksd/catalog';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { canonicalWeatherFileToProjectPayload } from '../../src/app/adapters/weatherFiles.js';
import { runSizingOptimization } from '../../src/app/services/sizingOptimization.js';
import type { PresizingOutputV1 } from '@ksd/engine';

/** Optimisation (spec 011, FR-029 → FR-031) : références bornées, annulation, simulation annuelle des propositions. */
describe('sizing optimization over my references', () => {
  const projects = new InMemoryProjects();
  let calc: AioCalculations;
  let equipment: readonly Equipment[];
  let projectId = '';
  let pre: PresizingOutputV1['selected'];

  beforeAll(async () => {
    const catalog = new CanonicalCatalog();
    const [localities, weatherSources, loadProfiles, weatherFiles, list] = await Promise.all([catalog.listLocalities(), catalog.listWeatherSources(), catalog.listLoadProfiles(), catalog.listWeatherFiles(), catalog.list()]);
    equipment = list;
    const locality = localities.find((candidate) => weatherSources.some((source) => source.localityId === candidate.id))!;
    const source = weatherSources.find((candidate) => candidate.localityId === locality.id)!;
    const file = weatherFiles.find((candidate) => candidate.metadata.weatherSourceId === source.id)!;
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.load.profiles[0]!.appliances.push({ id: 'l', name: 'L', qty: 10, unitPower: 150, yield: 1, operatingFractions: Array.from({ length: 24 }, (_, hour) => (hour >= 8 && hour < 16 ? 1 : 0)), opHours: 8, startupCoef: 1, inductive: false });
    Object.assign(view.site, { localityId: locality.id, latitude: locality.latitudeDeg, longitude: locality.longitudeDeg, timezoneIana: file.metadata.timezoneIana, weatherSourceId: source.id, tilt: 15, azimuth: 180 });
    view.site.downloadedSource = { name: 'x', provider: 'PVGIS', versionOrDate: 'x', locator: 'x', retrievedAtIso: file.metadata.retrievedAtIso, qualityFlags: [], ...canonicalWeatherFileToProjectPayload(file) };
    projects.replace(projectViewToFile(view));
    projectId = view.id;
    calc = new AioCalculations((id) => projects.get(id), { localities, weatherSources, loadProfiles, equipment: list }, (project) => projects.replace(project));
    pre = (await calc.runPresizing(projectId, () => undefined)).output.selected;
  });

  const run = (signal?: AbortSignal) => {
    const modules = equipment.filter((item) => item.kind === 'pv-module').slice(0, 3).map((item) => item.id);
    const batteries = equipment.filter((item) => item.kind === 'battery').slice(0, 3).map((item) => item.id);
    return runSizingOptimization({
      project: projectFileToView(projects.get(projectId)!), equipment, coldTemperatureC: 10,
      requirements: { pvKw: pre.pvPeakKw, storageKwh: pre.storageKwh, inverterKw: pre.inverterKw },
      request: { enabled: true, module: { mode: 'shortlist', equipmentIds: modules }, battery: { mode: 'shortlist', equipmentIds: batteries }, inverter: { mode: 'free' }, objective: 'closest', topN: 3 },
      ...(signal === undefined ? {} : { signal }),
    });
  };

  it('combines only my references and simulates the proposals over the year', async () => {
    const result = await run();
    expect(result.status).toBe('complete');
    if (result.status !== 'complete') return;
    expect(result.examined).toBe(3 * 3 * equipment.filter((item) => item.kind === 'inverter').length);
    expect(result.candidates.length).toBeGreaterThan(0);
    const simulations = await calc.simulateSystems(projectId, result.candidates.map((candidate) => ({ pvPeakKw: candidate.output.pv.obtainedPowerKwc, storageKwh: candidate.output.battery.usefulEnergyKwh, inverterKw: candidate.output.inverter.obtainedPowerKw })));
    expect(simulations).toHaveLength(result.candidates.length);
    for (const simulation of simulations!) {
      expect(simulation.sri).toBeGreaterThan(0);
      expect(simulation.sri).toBeLessThanOrEqual(1);
      expect(simulation.lpsp).toBeGreaterThanOrEqual(0);
    }
  });

  it('stops when cancelled', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(run(controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
