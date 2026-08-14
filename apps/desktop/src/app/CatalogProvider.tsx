import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { Locality, NormalizedHourlyProfile, WeatherSource } from '@ksd/domain';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import type { CatalogQueryPort, CatalogSummary } from './contracts.js';

interface CatalogContextValue {
  readonly equipment: readonly Equipment[];
  readonly localities: readonly Locality[];
  readonly weatherSources: readonly WeatherSource[];
  readonly loadProfiles: readonly NormalizedHourlyProfile[];
  readonly summary: CatalogSummary | null;
  readonly status: 'loading' | 'ready' | 'error';
  readonly errorCode: string | null;
  readonly retry: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

function readErrorCode(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'CATALOG_READ_FAILED';
}

export function CatalogProvider({
  children,
  catalog: providedCatalog,
}: {
  readonly children: ReactNode;
  readonly catalog?: CatalogQueryPort;
}) {
  const catalog = useMemo(() => providedCatalog ?? new CanonicalCatalog(), [providedCatalog]);
  const [revision, setRevision] = useState(0);
  const [equipment, setEquipment] = useState<readonly Equipment[]>([]);
  const [localities, setLocalities] = useState<readonly Locality[]>([]);
  const [weatherSources, setWeatherSources] = useState<readonly WeatherSource[]>([]);
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
      catalog.listLoadProfiles(),
      catalog.summary(),
    ]).then(([nextEquipment, nextLocalities, nextWeatherSources, nextLoadProfiles, nextSummary]) => {
      if (!active) return;
      setEquipment(nextEquipment);
      setLocalities(nextLocalities);
      setWeatherSources(nextWeatherSources);
      setLoadProfiles(nextLoadProfiles);
      setSummary(nextSummary);
      setStatus('ready');
    }).catch((error: unknown) => {
      if (!active) return;
      setErrorCode(readErrorCode(error));
      setStatus('error');
    });
    return () => { active = false; };
  }, [catalog, revision]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  const value = useMemo<CatalogContextValue>(() => ({
    equipment, localities, weatherSources, loadProfiles, summary, status, errorCode, retry,
  }), [equipment, errorCode, loadProfiles, localities, retry, status, summary, weatherSources]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog(): CatalogContextValue {
  const context = useContext(CatalogContext);
  if (context === null) throw new Error('CatalogProvider is required');
  return context;
}
