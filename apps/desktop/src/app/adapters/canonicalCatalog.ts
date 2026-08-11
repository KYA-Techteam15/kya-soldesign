import { validateEquipment, type Equipment } from '@ksd/catalog';
import { localitySchema, weatherSourceSchema, type Locality, type WeatherSource } from '@ksd/domain';
import equipmentSnapshot from '../../../../../packages/catalog/data/equipment.json';
import localitySnapshot from '../../../../../packages/catalog/data/localities.json';
import weatherSourceSnapshot from '../../../../../packages/catalog/data/weather-sources.json';
import type { CatalogQuery, CatalogQueryPort } from '../contracts.js';

interface SnapshotDocument {
  readonly schemaVersion: number;
  readonly records: readonly unknown[];
}

function parseSnapshot(value: unknown): readonly Equipment[] {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as SnapshotDocument).records)) {
    throw new Error('CATALOG_SNAPSHOT_INVALID');
  }

  const accepted: Equipment[] = [];
  for (const record of (value as SnapshotDocument).records) {
    const result = validateEquipment(record);
    if (result.equipment === null || result.issues.some((issue) => issue.severity === 'error')) {
      throw new Error('CATALOG_SNAPSHOT_INVALID');
    }
    accepted.push(result.equipment);
  }
  return accepted.sort((left, right) => left.manufacturer.localeCompare(right.manufacturer) || left.model.localeCompare(right.model));
}

function records(value: unknown): readonly unknown[] {
  if (typeof value !== 'object' || value === null || !Array.isArray((value as SnapshotDocument).records)) throw new Error('CATALOG_SNAPSHOT_INVALID');
  return (value as SnapshotDocument).records;
}

function parseLocalities(value: unknown): readonly Locality[] {
  return records(value).map((record) => localitySchema.parse(record)).sort((left, right) => left.name.localeCompare(right.name));
}

function parseWeatherSources(value: unknown): readonly WeatherSource[] {
  return records(value).map((record) => weatherSourceSchema.parse(record)).sort((left, right) => left.sourceName.localeCompare(right.sourceName));
}

export class CanonicalCatalog implements CatalogQueryPort {
  private readonly equipment = parseSnapshot(equipmentSnapshot);
  private readonly localities = parseLocalities(localitySnapshot);
  private readonly weatherSources = parseWeatherSources(weatherSourceSnapshot);

  public async list(query: CatalogQuery = {}): Promise<readonly Equipment[]> {
    const needle = query.text?.trim().toLocaleLowerCase() ?? '';
    return this.equipment.filter((equipment) => {
      const matchesKind = query.kind === undefined || equipment.kind === query.kind;
      const haystack = `${equipment.manufacturer} ${equipment.model}`.toLocaleLowerCase();
      return matchesKind && (needle.length === 0 || haystack.includes(needle));
    });
  }

  public async listLocalities(): Promise<readonly Locality[]> {
    return this.localities;
  }

  public async listWeatherSources(localityId?: string): Promise<readonly WeatherSource[]> {
    return localityId === undefined ? this.weatherSources : this.weatherSources.filter((source) => source.localityId === localityId);
  }
}
