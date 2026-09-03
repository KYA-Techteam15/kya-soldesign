import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  asEquipmentRecord,
  createUserEquipment as createUserEquipmentCommand,
  duplicateEquipment as duplicateEquipmentCommand,
  updateUserEquipment as updateUserEquipmentCommand,
  type Equipment,
  type EquipmentRecordV2,
} from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import { IndexedDbWeatherLibrary } from './adapters/weatherLibrary.js';
import { LocalUserCatalog } from './adapters/userCatalog.js';
import type { CanonicalWeatherFile, CatalogQueryPort, CatalogSummary, SavedWeatherCatalogRecord, UserCatalogPort, WeatherLibraryPort } from './contracts.js';

interface CatalogContextValue {
  readonly equipment: readonly Equipment[];
  readonly userEquipment: readonly Equipment[];
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly weatherFiles: readonly CanonicalWeatherFile[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
  readonly summary: CatalogSummary | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly errorCode: string | null;
  readonly retry: () => void;
  readonly saveWeather: (record: SavedWeatherCatalogRecord) => Promise<void>;
  readonly reloadUserEquipment: () => void;
  readonly createUserEquipment: (draft: Equipment) => Promise<EquipmentRecordV2>;
  readonly duplicateUserEquipment: (source: Equipment) => Promise<EquipmentRecordV2>;
  readonly updateUserEquipment: (source: EquipmentRecordV2, draft: Equipment) => Promise<EquipmentRecordV2>;
  readonly archiveUserEquipment: (source: EquipmentRecordV2) => Promise<void>;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function readErrorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'CATALOG_READ_FAILED';
}

export function CatalogProvider({
  children,
  catalog: providedCatalog,
  weatherLibrary: providedWeatherLibrary,
  userCatalog: providedUserCatalog,
}: {
  readonly children: ReactNode;
  readonly catalog?: CatalogQueryPort;
  readonly weatherLibrary?: WeatherLibraryPort;
  readonly userCatalog?: UserCatalogPort;
}) {
  const catalog = useMemo(() => providedCatalog ?? new CanonicalCatalog(), [providedCatalog]);
  const weatherLibrary = useMemo(() => providedWeatherLibrary ?? new IndexedDbWeatherLibrary(), [providedWeatherLibrary]);
  const userCatalog = useMemo(() => providedUserCatalog ?? new LocalUserCatalog(), [providedUserCatalog]);
  const [revision, setRevision] = useState(0);
  const [equipment, setEquipment] = useState<readonly Equipment[]>([]);
  const [userEquipment, setUserEquipment] = useState<readonly Equipment[]>([]);
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
      userCatalog.list(),
    ]).then(([nextEquipment, nextLocalities, nextWeatherSources, nextWeatherFiles, nextLoadProfiles, nextSummary, savedWeather, nextUserEquipment]) => {
      if (!active) return;
      const combinedFiles = mergeById(nextWeatherFiles, savedWeather.map((record) => record.file), (file) => file.metadata.id);
      const combinedLocalities = mergeById(nextLocalities, savedWeather.map((record) => record.locality), (locality) => locality.id);
      const combinedSources = mergeById(nextWeatherSources, savedWeather.map((record) => record.source), (source) => source.id);
      const backedLocalityIds = new Set(combinedFiles.map((file) => file.metadata.localityId));
      const backedSourceIds = new Set(combinedFiles.map((file) => file.metadata.weatherSourceId));
      setEquipment(nextEquipment);
      setUserEquipment(nextUserEquipment.filter((item) => item.archivedAt === null));
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
  }, [catalog, revision, userCatalog, weatherLibrary]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const saveWeather = useCallback(async (record: SavedWeatherCatalogRecord) => {
    await weatherLibrary.save(record);
    setLocalities((current) => mergeById(current, [record.locality], (locality) => locality.id));
    setWeatherSources((current) => mergeById(current, [record.source], (source) => source.id));
    setWeatherFiles((current) => mergeById(current, [record.file], (file) => file.metadata.id));
  }, [weatherLibrary]);
  const reloadUserEquipment = useCallback(() => setRevision((value) => value + 1), []);
  const createUserEquipment = useCallback(async (draft: Equipment) => {
    const command = createUserEquipmentCommand(draft, crypto.randomUUID());
    if (command.status === 'rejected') throw new Error(command.issues?.join(',') ?? command.code);
    await userCatalog.create(command.equipment);
    setRevision((value) => value + 1);
    return command.equipment;
  }, [userCatalog]);
  const duplicateUserEquipment = useCallback(async (source: Equipment) => {
    const command = duplicateEquipmentCommand(asEquipmentRecord(source), crypto.randomUUID());
    if (command.status === 'rejected') throw new Error(command.issues?.join(',') ?? command.code);
    await userCatalog.create(command.equipment);
    setRevision((value) => value + 1);
    return command.equipment;
  }, [userCatalog]);
  const updateUserEquipment = useCallback(async (source: EquipmentRecordV2, draft: Equipment) => {
    const command = updateUserEquipmentCommand(source, source.version, draft);
    if (command.status === 'rejected') throw new Error(command.issues?.join(',') ?? command.code);
    await userCatalog.replace(command.equipment, source.version);
    setRevision((value) => value + 1);
    return command.equipment;
  }, [userCatalog]);
  const archiveUserEquipment = useCallback(async (source: EquipmentRecordV2) => {
    if (source.origin !== 'user') throw new Error('KYA_IMMUTABLE');
    await userCatalog.archive(source.id, source.version);
    setRevision((value) => value + 1);
  }, [userCatalog]);
  const value = useMemo<CatalogContextValue>(() => ({
    equipment: [...equipment, ...userEquipment], userEquipment, localities, weatherSources, weatherFiles, loadProfiles, summary, status, errorCode, retry, saveWeather, reloadUserEquipment, createUserEquipment, duplicateUserEquipment, updateUserEquipment, archiveUserEquipment,
  }), [archiveUserEquipment, createUserEquipment, duplicateUserEquipment, equipment, errorCode, loadProfiles, localities, reloadUserEquipment, retry, saveWeather, status, summary, updateUserEquipment, userEquipment, weatherFiles, weatherSources]);
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
