import type { Equipment } from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { CanonicalWeatherFile } from '../contracts.js';
import { AioCalculations } from '../adapters/aioCalculations.js';
import { canonicalWeatherFileToProjectPayload } from '../adapters/weatherFiles.js';
import { createEmptyProjectFile, projectFileToView, projectViewToFile } from '../models/projectAdapters.js';
import type { ApplianceView } from '../models/projectView.js';
import type { ApplicationSettingsV2 } from '../models/applicationSettings.js';
import { applyProjectDefaults } from './createProject.js';
import { projectProtections } from '../diagram/projectDiagram.js';

/**
 * Projet exemple (spec 011, FR-007) : un centre de santé à Bombouaka, complet de l'identification
 * au chiffrage. Le modèle est embarqué ; la météo vient du fichier PVGIS livré avec le catalogue et
 * les calculs sont refaits à l'ouverture par le moteur courant : l'exemple n'est jamais périmé.
 */
export interface ExampleReferences {
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly weatherFiles: readonly CanonicalWeatherFile[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
  readonly equipment: readonly Equipment[];
}

/**
 * Matériel retenu, parmi les propositions de l'optimisation pour ce besoin : module JA Solar 410 W,
 * batterie Galaxy Energy 48 V 150 Ah, onduleur hybride hors réseau MPP Solar V2-3048.
 */
export const EXAMPLE_SELECTION = {
  moduleId: 'pv-module_f4e7985f193d36b057eec20c',
  batteryId: 'battery_cc0e90d4d82544054f57fb2b',
  inverterId: 'inverter_dd99afa89910725742402623',
} as const;

/** Longueurs de câble d'un petit bâtiment : toit → local technique, local, local → tableau. */
const CABLE_LENGTHS_M = { pv_inverter: 15, inverter_battery: 3, inverter_load: 20 } as const;

const hours = (...ranges: readonly (readonly [number, number])[]): number[] =>
  Array.from({ length: 24 }, (_, hour) => (ranges.some(([from, to]) => hour >= from && hour < to) ? 1 : 0));

function appliance(id: string, name: string, qty: number, unitPower: number, schedule: number[], startupCoef = 1): ApplianceView {
  return { id, name, qty, unitPower, yield: 1, operatingFractions: schedule, opHours: schedule.reduce((sum, value) => sum + value, 0), startupCoef, inductive: startupCoef !== 1 };
}

const TEXT = {
  fr: { name: 'Centre de santé de Bombouaka (exemple)', client: 'District sanitaire de Tône', location: 'Bombouaka, Togo', lighting: 'Éclairage LED', fridge: 'Réfrigérateur à vaccins', computer: 'Ordinateur', fan: 'Ventilateur', sterilizer: 'Stérilisateur', phones: 'Chargeurs de téléphone' },
  en: { name: 'Bombouaka health centre (example)', client: 'Tône health district', location: 'Bombouaka, Togo', lighting: 'LED lighting', fridge: 'Vaccine refrigerator', computer: 'Computer', fan: 'Fan', sterilizer: 'Sterilizer', phones: 'Phone chargers' },
} as const;

export async function createExampleProject(references: ExampleReferences, settings: ApplicationSettingsV2, lang: 'fr' | 'en', id: string = crypto.randomUUID(), now = new Date().toISOString(), selection: { readonly moduleId: string | null; readonly batteryId: string | null; readonly inverterId: string | null } = EXAMPLE_SELECTION): Promise<ProjectFileV1> {
  const text = TEXT[lang];
  const weatherFile = references.weatherFiles.find((file) => file.metadata.relativePath.includes('bombouaka'));
  const source = weatherFile && references.weatherSources.find((candidate) => candidate.id === weatherFile.metadata.weatherSourceId);
  const locality = source && references.localities.find((candidate) => candidate.id === source.localityId);
  if (!weatherFile || !source || !locality) throw new Error('EXAMPLE_WEATHER_MISSING');

  const view = projectFileToView(applyProjectDefaults(createEmptyProjectFile(id, 'standalone-all-in-one', now, text.name), settings));
  Object.assign(view.details, { clientName: text.client, projectNumber: 'EXEMPLE-001', projectLocation: text.location, applicationType: 'commercial', projectDate: now.slice(0, 10) });
  Object.assign(view.site, {
    country: 'Togo', countryCode: 'TG', localityId: locality.id, region: locality.name,
    latitude: locality.latitudeDeg, longitude: locality.longitudeDeg, timezoneIana: weatherFile.metadata.timezoneIana,
    weatherSourceId: source.id, tilt: 15, azimuth: 180,
  });
  const weather = canonicalWeatherFileToProjectPayload(weatherFile);
  view.site.downloadedSource = {
    name: source.sourceName, provider: 'PVGIS', versionOrDate: '5.3', locator: weatherFile.metadata.relativePath,
    retrievedAtIso: weatherFile.metadata.retrievedAtIso, qualityFlags: [], ...weather,
    hourlyIrradiance: weather.hourlyIrradiance.map((point) => ({ ...point })),
  };
  view.load.profiles[0]!.appliances.push(
    appliance('ex-lighting', text.lighting, 20, 12, hours([18, 24], [5, 7])),
    appliance('ex-fridge', text.fridge, 1, 150, hours([0, 24]), 3),
    appliance('ex-computer', text.computer, 2, 65, hours([8, 16])),
    appliance('ex-fan', text.fan, 4, 50, hours([11, 17]), 1.5),
    appliance('ex-sterilizer', text.sterilizer, 1, 1000, hours([9, 11])),
    appliance('ex-phones', text.phones, 4, 10, hours([8, 16])),
  );
  view.selection = { ...selection };
  Object.assign(view.costing, {
    moduleUnitPrice: 95_000, moduleMargin: 15, batteryUnitPrice: 1_150_000, batteryMargin: 15,
    inverterUnitPrice: 1_400_000, inverterMargin: 15,
  });

  view.cables = view.cables.map((cable) => ({ ...cable, length: CABLE_LENGTHS_M[cable.segment] }));

  let file = projectViewToFile(view);
  const calculations = new AioCalculations((wanted) => (wanted === file.id ? file : null), references, (next) => { file = next; });
  await calculations.runPresizing(file.id, () => undefined);
  if (!selection.moduleId || !selection.batteryId || !selection.inverterId) return file;
  const sizing = await calculations.runSizing(file.id, () => undefined);
  // Les calibres suggérés sont inscrits : l'exemple arrive avec des protections validées.
  const sized = projectFileToView(file);
  const { protections } = projectProtections(sized, sizing.output.valid ? sizing.output : null, references.equipment);
  sized.protections = protections.map((protection) => ({ segment: protection.segment, caliberA: protection.recommendedRatingA, type: protection.recommendedType }));
  return projectViewToFile(sized);
}
