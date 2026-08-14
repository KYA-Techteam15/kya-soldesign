import { describe, expect, it } from 'vitest';
import type { AioSizingOutputV1 } from '@ksd/engine';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { projectToAioInput } from '../../src/app/adapters/projectToAio.js';

describe('Page 1 project to AIO integration', () => {
  it('calculates the load summary from the canonical project and blocks dependent assumptions only', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000101');
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.site.timezoneIana = 'Africa/Lome';
    view.load.profiles[0]!.classic.push({
      id: 'lighting', name: 'Éclairage', qty: 4, unitPower: 20, yield: 1,
      simultaneity: 0.5, operatingFractions: Array.from({ length: 24 }, (_, hour) => hour >= 18 && hour < 22 ? 1 : 0), opHours: 4,
    });
    projects.replace(projectViewToFile(view));
    const catalog = new CanonicalCatalog();
    const calculations = new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(),
      weatherSources: await catalog.listWeatherSources(),
      loadProfiles: await catalog.listLoadProfiles(),
    });
    const state = await calculations.read<AioSizingOutputV1>(view.id, 'sizing');
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;
    expect(state.envelope.output.dailyAcEnergyWh).toMatchObject({ status: 'available', value: 160, unit: 'Wh' });
    expect(state.envelope.output.peakCoincidentAcPowerW).toMatchObject({ status: 'available', value: 40, unit: 'W' });
    expect(state.envelope.output.minimumPvStcPowerW.status).toBe('blocked');
  });

  it('requires a timezone rather than inventing one', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000102');
    const project = projects.create('standalone-all-in-one', 'fr');
    const catalog = new CanonicalCatalog();
    const calculations = new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(), weatherSources: await catalog.listWeatherSources(), loadProfiles: await catalog.listLoadProfiles(),
    });
    const state = await calculations.read<AioSizingOutputV1>(project.id, 'sizing');
    expect(state).toEqual({ status: 'empty', messageKey: 'SITE_TIMEZONE_MISSING' });
  });

  it('normalizes the direct 24-hour mode without changing its energy', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000103');
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.site.timezoneIana = 'Africa/Lome';
    const profile = view.load.profiles[0]!;
    profile.source = 'hourly';
    profile.hourly.forEach((point) => { point.realPower = 0.1; point.peakPower = 0.1; });
    projects.replace(projectViewToFile(view));
    const catalog = new CanonicalCatalog();
    const calculations = new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(), weatherSources: await catalog.listWeatherSources(), loadProfiles: await catalog.listLoadProfiles(),
    });
    const state = await calculations.read<AioSizingOutputV1>(view.id, 'sizing');
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;
    expect(state.envelope.output.dailyAcEnergyWh).toMatchObject({ status: 'available', value: 2_400, unit: 'Wh' });
    expect(state.envelope.output.peakCoincidentAcPowerW).toMatchObject({ status: 'available', value: 100, unit: 'W' });
  });

  it('normalizes the meter mode using exact observed days and a sourced profile', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000104');
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.site.timezoneIana = 'Africa/Lome';
    const catalog = new CanonicalCatalog();
    const loadProfiles = await catalog.listLoadProfiles();
    const profile = view.load.profiles[0]!;
    profile.source = 'meter';
    profile.meter = {
      observedEnergy: 31, observedDays: 31, normalizedProfileId: loadProfiles[0]!.id,
      meterAmperage: 0, networkType: 'single_phase', morningPeakStart: '', morningPeakEnd: '',
      eveningPeakStart: '', eveningPeakEnd: '', peakImportance: 0, targetQualityFactor: 0,
    };
    projects.replace(projectViewToFile(view));
    const calculations = new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(), weatherSources: await catalog.listWeatherSources(), loadProfiles,
    });
    const state = await calculations.read<AioSizingOutputV1>(view.id, 'sizing');
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;
    expect(state.envelope.output.dailyAcEnergyWh).toMatchObject({ status: 'available', value: 1_000, unit: 'Wh' });
    expect(state.envelope.output.minimumInverterSurgeAcPowerW.status).toBe('blocked');
  });

  it('includes complete fresh solar evidence and omits it after an orientation change', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000105');
    const catalog = new CanonicalCatalog();
    const localities = await catalog.listLocalities();
    const weatherSources = await catalog.listWeatherSources();
    const loadProfiles = await catalog.listLoadProfiles();
    const locality = localities.find((candidate) => weatherSources.some((source) => source.localityId === candidate.id))!;
    const weatherSource = weatherSources.find((candidate) => candidate.localityId === locality.id)!;
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.load.profiles[0]!.source = 'hourly';
    view.site.localityId = locality.id;
    view.site.latitude = locality.latitudeDeg;
    view.site.longitude = locality.longitudeDeg;
    view.site.timezoneIana = 'Africa/Lome';
    view.site.weatherSourceId = weatherSource.id;
    view.site.designMonth = 1;
    view.site.tilt = 10;
    view.site.azimuth = 180;
    view.site.irradiationBasis = { tilt: 10, azimuth: 180 };
    view.site.monthlyIrradiation = [4.8, ...Array.from<null>({ length: 11 }).fill(null)];
    view.site.downloadedSource = {
      name: 'Document solaire contrôlé', provider: weatherSource.provider, versionOrDate: 'TMY 2005–2020',
      locator: 'document:test-resource', retrievedAtIso: '2026-08-14T04:00:00.000Z', qualityFlags: ['user-declared-monthly-poa'],
    };
    const file = projectViewToFile(view);
    const ready = await projectToAioInput(file, { localities, weatherSources, loadProfiles });
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') return;
    expect(ready.input.solarDesignResource?.planeOfArrayIrradiationKWhPerM2PerDay).toBe(4.8);
    expect(ready.input.solarDesignResource?.provenance.sourceSha256).toMatch(/^[a-f0-9]{64}$/);

    view.site.tilt = 11;
    const stale = await projectToAioInput(projectViewToFile(view), { localities, weatherSources, loadProfiles });
    expect(stale.status).toBe('ready');
    if (stale.status !== 'ready') return;
    expect(stale.input.solarDesignResource).toBeUndefined();
  });
});
