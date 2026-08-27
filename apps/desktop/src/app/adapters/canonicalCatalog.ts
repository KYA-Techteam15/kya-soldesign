import { pvgisTmyJsonSchema, validateEquipment, weatherFileManifestSchema, type Equipment } from '@ksd/catalog';
import { localitySchema, normalizedHourlyProfileSchema, weatherSourceSchema, type Locality, type NormalizedHourlyProfile, type WeatherSource } from '@ksd/domain';
import equipmentSnapshot from '../../../../../packages/catalog/data/equipment.json';
import localitySnapshot from '../../../../../packages/catalog/data/localities.json';
import weatherSourceSnapshot from '../../../../../packages/catalog/data/weather-sources.json';
import weatherFileManifestSnapshot from '../../../../../packages/catalog/data/weather-files.json';
import bombouakaTmySnapshot from '../../../../../packages/catalog/data/weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json';
import loadProfileSnapshot from '../../../../../packages/catalog/data/load-profiles.json';
import qualitySnapshot from '../../../../../packages/catalog/data/quality-report.json';
import type { CanonicalWeatherFile, CatalogQuery, CatalogQueryPort, CatalogSummary } from '../contracts.js';

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

function parseLoadProfiles(value: unknown): readonly NormalizedHourlyProfile[] {
  return records(value).map((record) => normalizedHourlyProfileSchema.parse(record)).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export class CanonicalCatalog implements CatalogQueryPort {
  private readonly equipment = parseSnapshot(equipmentSnapshot);
  private readonly localities = parseLocalities(localitySnapshot);
  private readonly weatherSources = parseWeatherSources(weatherSourceSnapshot);
  private readonly weatherFiles = parseWeatherFiles();
  private readonly loadProfiles = parseLoadProfiles(loadProfileSnapshot);

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

  public async listWeatherFiles(): Promise<readonly CanonicalWeatherFile[]> {
    return this.weatherFiles;
  }

  public async listLoadProfiles(): Promise<readonly NormalizedHourlyProfile[]> {
    return this.loadProfiles;
  }

  public async summary(): Promise<CatalogSummary> {
    const quality = qualitySnapshot as {
      readonly reports: {
        readonly pvModules: { readonly quarantinedRecordCount: number };
        readonly batteries: { readonly quarantinedRecordCount: number };
        readonly inverters: { readonly quarantinedRecordCount: number };
      };
      readonly totals: { readonly warnings: number };
    };
    const count = (kind: Equipment['kind']) => this.equipment.filter((item) => item.kind === kind).length;
    return {
      accepted: {
        'pv-module': count('pv-module'),
        battery: count('battery'),
        inverter: count('inverter'),
      },
      quarantined: {
        'pv-module': quality.reports.pvModules.quarantinedRecordCount,
        battery: quality.reports.batteries.quarantinedRecordCount,
        inverter: quality.reports.inverters.quarantinedRecordCount,
      },
      warnings: quality.totals.warnings,
      localities: this.localities.length,
      weatherSources: this.weatherSources.length,
      metadata: { version: null, generatedAtIso: null, sourceLabel: 'equipment.json · snapshots canoniques' },
    };
  }
}

function parseWeatherFiles(): readonly CanonicalWeatherFile[] {
  const manifest = weatherFileManifestSchema.parse(weatherFileManifestSnapshot);
  const documentsByPath = new Map<string, unknown>([
    ['weather/pvgis-5.3-tmy-bombouaka-tg-10.7030-0.2099.json', bombouakaTmySnapshot],
  ]);
  return manifest.records.map((metadata) => {
    const document = documentsByPath.get(metadata.relativePath);
    if (document === undefined) throw new Error('CATALOG_WEATHER_FILE_MISSING');
    return { metadata, document: pvgisTmyJsonSchema.parse(document) };
  });
}
