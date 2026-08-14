import { pvgisTmyJsonSchema, weatherFileRecordSchema } from '@ksd/catalog';
import { localitySchema, weatherSourceSchema } from '@ksd/domain';
import type { CanonicalWeatherFile, SavedWeatherCatalogRecord, WeatherLibraryPort } from '../contracts.js';

const DATABASE_NAME = 'kya-sol-design';
const DATABASE_VERSION = 1;
const STORE_NAME = 'weather-library';

export class IndexedDbWeatherLibrary implements WeatherLibraryPort {
  public constructor(private readonly factory: IDBFactory | undefined = globalThis.indexedDB) {}

  public async list(): Promise<readonly SavedWeatherCatalogRecord[]> {
    if (!this.factory) return [];
    const database = await this.open();
    try {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const values = await requestResult(transaction.objectStore(STORE_NAME).getAll());
      return values.flatMap((value) => {
        try { return [parseSavedWeatherRecord(value)]; }
        catch { return []; }
      });
    } finally {
      database.close();
    }
  }

  public async save(record: SavedWeatherCatalogRecord): Promise<void> {
    if (!this.factory) throw new Error('WEATHER_STORAGE_UNAVAILABLE');
    const checked = parseSavedWeatherRecord(record);
    const database = await this.open();
    try {
      const transaction = database.transaction(STORE_NAME, 'readwrite');
      const completed = transactionResult(transaction);
      transaction.objectStore(STORE_NAME).put(checked);
      await completed;
    } finally {
      database.close();
    }
  }

  private async open(): Promise<IDBDatabase> {
    if (!this.factory) throw new Error('WEATHER_STORAGE_UNAVAILABLE');
    const request = this.factory.open(DATABASE_NAME, DATABASE_VERSION);
    request.addEventListener('upgradeneeded', () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    });
    return requestResult(request);
  }
}

export class InMemoryWeatherLibrary implements WeatherLibraryPort {
  private records = new Map<string, SavedWeatherCatalogRecord>();

  public constructor(seed: readonly SavedWeatherCatalogRecord[] = []) {
    for (const record of seed) this.records.set(record.key, parseSavedWeatherRecord(record));
  }

  public async list(): Promise<readonly SavedWeatherCatalogRecord[]> {
    return [...this.records.values()].map((record) => structuredClone(record));
  }

  public async save(record: SavedWeatherCatalogRecord): Promise<void> {
    const checked = parseSavedWeatherRecord(record);
    this.records.set(checked.key, structuredClone(checked));
  }
}

export function createSavedWeatherRecord(input: {
  readonly siteName: string;
  readonly countryCode: string;
  readonly sourceName: string;
  readonly locator: string;
  readonly optimalTilt: number;
  readonly optimalAzimuth: number;
  readonly timezoneIana: string | null;
  readonly file: CanonicalWeatherFile;
}): SavedWeatherCatalogRecord {
  const sourceSha256 = input.file.metadata.sourceSha256;
  const localityId = input.file.metadata.localityId;
  const weatherSourceId = input.file.metadata.weatherSourceId;
  const provenance = {
    sourceId: input.file.metadata.id,
    sourceRecordId: input.locator,
    sourceSha256,
    transformationVersion: '1.0.0',
  };
  return parseSavedWeatherRecord({
    key: weatherLibraryKey(input.countryCode, input.siteName),
    locality: {
      id: localityId,
      name: input.siteName.trim(),
      countryCode: input.countryCode,
      latitudeDeg: input.file.metadata.latitudeDeg,
      longitudeDeg: input.file.metadata.longitudeDeg,
      elevationM: input.file.document.inputs.location.elevation,
      timezone: input.timezoneIana ?? input.file.metadata.timezoneIana,
      provenance,
    },
    source: {
      id: weatherSourceId,
      localityId,
      provider: 'PVGIS',
      sourceName: input.sourceName,
      defaultTiltDeg: input.optimalTilt,
      defaultAzimuthDeg: input.optimalAzimuth,
      provenance,
    },
    file: input.file,
  });
}

export function parseSavedWeatherRecord(value: unknown): SavedWeatherCatalogRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('WEATHER_LIBRARY_RECORD_INVALID');
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.key !== 'string') throw new Error('WEATHER_LIBRARY_KEY_INVALID');
  const locality = localitySchema.parse(candidate.locality);
  const source = weatherSourceSchema.parse(candidate.source);
  if (typeof candidate.file !== 'object' || candidate.file === null || Array.isArray(candidate.file)) throw new Error('WEATHER_LIBRARY_FILE_INVALID');
  const fileCandidate = candidate.file as Record<string, unknown>;
  const file = {
    metadata: weatherFileRecordSchema.parse(fileCandidate.metadata),
    document: pvgisTmyJsonSchema.parse(fileCandidate.document),
  };
  if (candidate.key !== weatherLibraryKey(locality.countryCode, locality.name)) throw new Error('WEATHER_LIBRARY_KEY_MISMATCH');
  if (source.localityId !== locality.id || file.metadata.localityId !== locality.id || file.metadata.weatherSourceId !== source.id) {
    throw new Error('WEATHER_LIBRARY_ASSOCIATION_INVALID');
  }
  return { key: candidate.key, locality, source, file };
}

export function weatherLibraryKey(countryCode: string, siteName: string): string {
  const normalizedName = siteName.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('en-US');
  return `${countryCode}:${normalizedName}`;
}

function requestResult<Result>(request: IDBRequest<Result>): Promise<Result> {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result), { once: true });
    request.addEventListener('error', () => reject(request.error ?? new Error('WEATHER_STORAGE_REQUEST_FAILED')), { once: true });
  });
}

function transactionResult(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', () => resolve(), { once: true });
    transaction.addEventListener('abort', () => reject(transaction.error ?? new Error('WEATHER_STORAGE_TRANSACTION_ABORTED')), { once: true });
    transaction.addEventListener('error', () => reject(transaction.error ?? new Error('WEATHER_STORAGE_TRANSACTION_FAILED')), { once: true });
  });
}
