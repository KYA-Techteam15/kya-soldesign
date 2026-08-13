/**
 * Référentiel matériel et géographique.
 *
 * Ces données ne sont PAS simulées : elles sont exportées telles quelles de la base
 * DuckDB de l'application PyQt. Elles sont embarquées dans le bundle — aucune requête
 * réseau, l'app fonctionne hors ligne (critère D1).
 */

import batteriesJson from './reference/batteries.json';
import countriesJson from './reference/countries.json';
import invertersJson from './reference/inverters.json';
import localitiesJson from './reference/localities.json';
import modulesJson from './reference/modules.json';
import weatherSourcesJson from './reference/weather_sources.json';

import type {
  BatteryRef,
  CountryRef,
  InverterRef,
  LocalityRef,
  ModuleRef,
  WeatherSourceRef,
} from '../domain/types';

export const modules = modulesJson as unknown as ModuleRef[];
export const batteries = batteriesJson as unknown as BatteryRef[];
export const inverters = invertersJson as unknown as InverterRef[];
export const localities = localitiesJson as unknown as LocalityRef[];
export const countries = countriesJson as unknown as CountryRef[];
export const weatherSources = weatherSourcesJson as unknown as WeatherSourceRef[];

export const referenceCounts = {
  modules: modules.length,
  batteries: batteries.length,
  inverters: inverters.length,
  localities: localities.length,
  countries: countries.length,
  weatherSources: weatherSources.length,
};

export const moduleByCode = (code: string): ModuleRef | undefined =>
  modules.find((m) => m.code === code);
export const batteryByCode = (code: string): BatteryRef | undefined =>
  batteries.find((b) => b.code === code);
export const inverterByCode = (code: string): InverterRef | undefined =>
  inverters.find((i) => i.code === code);
export const localityByName = (name: string): LocalityRef | undefined =>
  localities.find((l) => l.name === name);

export const countryName = (alpha2: string, lang: 'fr' | 'en'): string => {
  const c = countries.find((x) => x.alpha2 === alpha2);
  if (!c) return alpha2;
  return lang === 'fr' ? c.nom_fr_fr : c.nom_en_gb;
};

/** Fabricants distincts, pour les filtres du catalogue. */
export const makers = {
  modules: [...new Set(modules.map((m) => m.maker))].sort(),
  batteries: [...new Set(batteries.map((b) => b.maker))].sort(),
  inverters: [...new Set(inverters.map((i) => i.maker))].sort(),
};
