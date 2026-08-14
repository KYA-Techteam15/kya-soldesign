import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import { IndexedDbWeatherLibrary } from './adapters/weatherLibrary.js';
import type { CanonicalWeatherFile, CatalogQueryPort, CatalogSummary, SavedWeatherCatalogRecord, WeatherLibraryPort } from './contracts.js';

interface CatalogContextValue {
  readonly equipment: readonly Equipment[];
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly weatherFiles: readonly CanonicalWeatherFile[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
  readonly summary: CatalogSummary | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly errorCode: string | null;
  readonly retry: () => void;
  readonly saveWeather: (record: SavedWeatherCatalogRecord) => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function readErrorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'CATALOG_READ_FAILED';
}

export function CatalogProvider({
  children,
  catalog: providedCatalog,
  weatherLibrary: providedWeatherLibrary,
}: {
  readonly children: ReactNode;
  readonly catalog?: CatalogQueryPort;
  readonly weatherLibrary?: WeatherLibraryPort;
}) {
  const catalog = useMemo(() => providedCatalog ?? new CanonicalCatalog(), [providedCatalog]);
  const weatherLibrary = useMemo(() => providedWeatherLibrary ?? new IndexedDbWeatherLibrary(), [providedWeatherLibrary]);
  const [revision, setRevision] = useState(0);
  const [equipment, setEquipment] = useState<readonly Equipment[]>([]);
  const [localities, setLocalities] = useState<readonly Locality[]>([]);
  const [weatherSources, setWeatherSources] = useState<readonly WeatherSource[]>([]);
  const [weatherFiles, setWeatherFiles] = useState<readonly CanonicalWeatherFile[]>([]);
  const [loadProfiles, setLoadProfiles] = useState<readonly NormalizedHourlyProfile[]>([]);
  const [summary, setSummary] = useState<CatalogSummary | null>(null);
  const [status, setStatus] = useState<CatalogContextValue['status']>('loading');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    setErrorCode(null);
    void Promise.all([
      catalog.list(),
      catalog.listLocalities(),
      catalog.listWeatherSources(),
      catalog.listWeatherFiles(),
      catalog.listLoadProfiles(),
      catalog.summary(),
      weatherLibrary.list(),
    ]).then(([nextEquipment, nextLocalities, nextWeatherSources, nextWeatherFiles, nextLoadProfiles, nextSummary, savedWeather]) => {
      if (!active) return;
      const combinedFiles = mergeById(nextWeatherFiles, savedWeather.map((record) => record.file), (file) => file.metadata.id);
      const combinedLocalities = mergeById(nextLocalities, savedWeather.map((record) => record.locality), (locality) => locality.id);
      const combinedSources = mergeById(nextWeatherSources, savedWeather.map((record) => record.source), (source) => source.id);
      const backedLocalityIds = new Set(combinedFiles.map((file) => file.metadata.localityId));
      const backedSourceIds = new Set(combinedFiles.map((file) => file.metadata.weatherSourceId));
      setEquipment(nextEquipment);
      setLocalities(combinedLocalities.filter((locality) => backedLocalityIds.has(locality.id)));
      setWeatherSources(combinedSources.filter((source) => backedSourceIds.has(source.id)));
      setWeatherFiles(combinedFiles);
      setLoadProfiles(nextLoadProfiles);
      setSummary(nextSummary);
      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorCode(readErrorCode(error));
      setStatus('error');
    });
    return () => { active = false; };
  }, [catalog, revision, weatherLibrary]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const saveWeather = useCallback(async (record: SavedWeatherCatalogRecord) => {
    await weatherLibrary.save(record);
    setLocalities((current) => mergeById(current, [record.locality], (locality) => locality.id));
    setWeatherSources((current) => mergeById(current, [record.source], (source) => source.id));
    setWeatherFiles((current) => mergeById(current, [record.file], (file) => file.metadata.id));
  }, [weatherLibrary]);
  const value = useMemo<CatalogContextValue>(() => ({
    equipment, localities, weatherSources, weatherFiles, loadProfiles, summary, status, errorCode, retry, saveWeather,
  }), [equipment, errorCode, loadProfiles, localities, retry, saveWeather, status, summary, weatherFiles, weatherSources]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

function mergeById<Item>(base: readonly Item[], added: readonly Item[], id: (item: Item) => string): Item[] {
  const merged = new Map(base.map((item) => [id(item), item]));
  for (const item of added) merged.set(id(item), item);
  return [...merged.values()];
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (context === null) throw new Error('CatalogProvider is required');
  return context;
}
