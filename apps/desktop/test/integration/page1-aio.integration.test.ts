import { describe, expect, it } from 'vitest';
import type { AioSizingOutputV1, SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { AioCalculations } from '../../src/app/adapters/aioCalculations.js';
import { CanonicalCatalog } from '../../src/app/adapters/canonicalCatalog.js';
import { InMemoryProjects } from '../../src/app/adapters/inMemoryProjects.js';
import { projectFileToView, projectViewToFile } from '../../src/app/models/projectAdapters.js';
import { projectToAioInput } from '../../src/app/adapters/projectToAio.js';
import { canonicalWeatherFileToProjectPayload } from '../../src/app/adapters/weatherFiles.js';

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
      forceYEn: false, targetYEn: null,
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

  it('derives the solar resource from the verified hourly file and recomputes after an orientation change', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000105');
    const catalog = new CanonicalCatalog();
    const localities = await catalog.listLocalities();
    const weatherSources = await catalog.listWeatherSources();
    const loadProfiles = await catalog.listLoadProfiles();
    const weatherFiles = await catalog.listWeatherFiles();
    const locality = localities.find((candidate) => weatherSources.some((source) => source.localityId === candidate.id))!;
    const weatherSource = weatherSources.find((candidate) => candidate.localityId === locality.id)!;
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.load.profiles[0]!.source = 'hourly';
    view.load.profiles[0]!.hourly.forEach((point) => { point.realPower = 0.1; point.peakPower = 0.1; });
    view.site.localityId = locality.id;
    view.site.latitude = locality.latitudeDeg;
    view.site.longitude = locality.longitudeDeg;
    view.site.timezoneIana = 'Africa/Lome';
    view.site.weatherSourceId = weatherSource.id;
    view.site.designMonth = null;
    view.site.tilt = 15;
    view.site.azimuth = 180;
    const weatherFile = weatherFiles.find((candidate) => candidate.metadata.weatherSourceId === weatherSource.id)!;
    const payload = canonicalWeatherFileToProjectPayload(weatherFile);
    view.site.downloadedSource = {
      name: weatherSource.sourceName, provider: weatherSource.provider, versionOrDate: `TMY ${weatherFile.metadata.yearMin}–${weatherFile.metadata.yearMax}`,
      locator: weatherFile.metadata.relativePath, retrievedAtIso: weatherFile.metadata.retrievedAtIso, qualityFlags: ['pvgis-hourly-file-verified'],
      ...payload,
    };
    const file = projectViewToFile(view);
    const recommendationOnly = await projectToAioInput(file, { localities, weatherSources, loadProfiles });
    expect(recommendationOnly.status).toBe('ready');
    if (recommendationOnly.status !== 'ready') return;
    expect(recommendationOnly.solarAnalysis?.output.designMonth).toBe(8);
    expect(recommendationOnly.input.solarDesignResource).toBeUndefined();

    view.site.designMonth = 8;
    const ready = await projectToAioInput(projectViewToFile(view), { localities, weatherSources, loadProfiles });
    expect(ready.status).toBe('ready');
    if (ready.status !== 'ready') return;
    expect(ready.input.solarDesignResource?.planeOfArrayIrradiationKWhPerM2PerDay).toBeCloseTo(4.55, 1);
    expect(ready.input.solarDesignResource?.selectionMethod).toBe('declared-critical-month');
    expect(ready.input.solarDesignResource?.provenance.sourceSha256).toBe(weatherFile.metadata.sourceSha256);

    view.site.tilt = 25;
    const recomputed = await projectToAioInput(projectViewToFile(view), { localities, weatherSources, loadProfiles });
    expect(recomputed.status).toBe('ready');
    if (recomputed.status !== 'ready') return;
    expect(recomputed.solarAnalysis?.inputHash).not.toBe(ready.solarAnalysis?.inputHash);
    expect(recomputed.input.solarDesignResource).toBeDefined();

    view.load.profiles[0]!.source = 'meter';
    view.load.profiles[0]!.meter = {
      observedEnergy: 31, observedDays: 31, normalizedProfileId: loadProfiles[0]!.id,
      forceYEn: true, targetYEn: 0.75,
      meterAmperage: 0, networkType: 'single_phase', morningPeakStart: '', morningPeakEnd: '',
      eveningPeakStart: '', eveningPeakEnd: '', peakImportance: 0, targetQualityFactor: 0,
    };
    const adjusted = await projectToAioInput(projectViewToFile(view), { localities, weatherSources, loadProfiles });
    expect(adjusted.status).toBe('ready');
    if (adjusted.status !== 'ready') return;
    expect(adjusted.input.load.hourlyEnergyWh.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1_000, 8);
    expect(adjusted.solarAnalysis?.output.gamma.status).toBe('available');
    if (adjusted.solarAnalysis?.output.gamma.status === 'available') expect(adjusted.solarAnalysis.output.gamma.value).toBeCloseTo(0.75, 10);
    expect(adjusted.warnings.some((warning) => warning.code === 'LOAD_METER_YEN_ADJUSTED')).toBe(true);

    const projectsWithWeather = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000106', [file]);
    const calculations = new AioCalculations((id) => projectsWithWeather.get(id), { localities, weatherSources, loadProfiles });
    const solarState = await calculations.read<SolarResourceAnalysisOutputV1>(view.id, 'solar-resource');
    expect(solarState.status).toBe('ready');
    if (solarState.status === 'ready') expect(solarState.envelope.output.hourlyPoaWm2).toHaveLength(8_760);

    const persistent = new AioCalculations((id) => projectsWithWeather.get(id), { localities, weatherSources, loadProfiles }, (project) => projectsWithWeather.replace(project));
    const calculated = await persistent.runPresizing(view.id, () => undefined);
    expect(projectsWithWeather.get(view.id)?.lastCalculation).toEqual(calculated);
    const restored = await new AioCalculations((id) => projectsWithWeather.get(id), { localities, weatherSources, loadProfiles }).read(view.id, 'presizing');
    expect(restored.status).toBe('ready');
    const changed = projectFileToView(projectsWithWeather.get(view.id)!);
    changed.assumptions.actualizationRate += 1;
    projectsWithWeather.replace(projectViewToFile(changed));
    const stale = await new AioCalculations((id) => projectsWithWeather.get(id), { localities, weatherSources, loadProfiles }).read(view.id, 'presizing');
    expect(stale.status).toBe('stale');
  }, 20_000);

  it('analyzes an imported weather file in UTC but keeps gamma unavailable until a project timezone is declared', async () => {
    const projects = new InMemoryProjects(() => '2026-08-14T04:00:00.000Z', () => '00000000-0000-4000-8000-000000000107');
    const catalog = new CanonicalCatalog();
    const weatherFiles = await catalog.listWeatherFiles();
    const weatherFile = weatherFiles[0]!;
    const payload = canonicalWeatherFileToProjectPayload(weatherFile);
    const view = projectFileToView(projects.create('standalone-all-in-one', 'fr'));
    view.site.latitude = weatherFile.document.inputs.location.latitude;
    view.site.longitude = weatherFile.document.inputs.location.longitude;
    view.site.tilt = 15;
    view.site.azimuth = 180;
    view.site.timezoneIana = null;
    view.site.weatherSourceId = 'pvgis-import:bombouaka';
    view.site.downloadedSource = {
      name: 'Import UTC', provider: 'PVGIS', versionOrDate: 'TMY 2005–2023', locator: 'import://bombouaka.json',
      retrievedAtIso: weatherFile.metadata.retrievedAtIso, qualityFlags: ['pvgis-hourly-file-verified'],
      ...payload, timezoneOffsetMinutes: 0,
    };
    projects.replace(projectViewToFile(view));
    const calculations = new AioCalculations((id) => projects.get(id), {
      localities: await catalog.listLocalities(), weatherSources: await catalog.listWeatherSources(), loadProfiles: await catalog.listLoadProfiles(),
    });
    const state = await calculations.read<SolarResourceAnalysisOutputV1>(view.id, 'solar-resource');
    expect(state.status).toBe('ready');
    if (state.status !== 'ready') return;
    expect(state.envelope.output.hourlyPoaWm2).toHaveLength(8_760);
    expect(state.envelope.output.gamma.status).toBe('unavailable');
  });
});
