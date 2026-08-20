import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type {
  CalculationCapabilityPort,
  CapabilityId,
  CapabilityState,
} from './contracts.js';
import { unavailableCalculations } from './adapters/unavailableCalculations.js';
import { AioCalculations } from './adapters/aioCalculations.js';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import { useProjectSession } from './ProjectSessionProvider.js';

const CalculationContext = createContext<CalculationCapabilityPort | null>(null);

export function CalculationProvider({
  children,
  service,
}: {
  readonly children: ReactNode;
  readonly service?: CalculationCapabilityPort;
}) {
  const session = useProjectSession();
  const catalog = useMemo(() => new CanonicalCatalog(), []);
  const [references, setReferences] = useState<Awaited<ReturnType<typeof loadReferences>> | null>(null);
  useEffect(() => {
    let active = true;
    void loadReferences(catalog).then((next) => { if (active) setReferences(next); });
    return () => { active = false; };
  }, [catalog]);
  const defaultService = useMemo<CalculationCapabilityPort>(() => references === null ? unavailableCalculations : new AioCalculations(
    (id) => session.canonicalProjects.find((project) => project.id === id) ?? null,
    references,
  ), [references, session.canonicalProjects]);
  return (
    <CalculationContext.Provider value={service ?? defaultService}>
      {children}
    </CalculationContext.Provider>
  );
}

async function loadReferences(catalog: CanonicalCatalog) {
  const [localities, weatherSources, loadProfiles] = await Promise.all([
    catalog.listLocalities(), catalog.listWeatherSources(), catalog.listLoadProfiles(),
  ]);
  return { localities, weatherSources, loadProfiles };
}

export function useCalculationState<Output>(
  projectId: string,
  capability: CapabilityId,
  inputRevision?: string,
): CapabilityState<Output> {
  const service = useContext(CalculationContext);
  if (service === null) throw new Error('CalculationProvider is required');
  const loading = useMemo<CapabilityState<Output>>(
    () => ({ status: 'loading', messageKey: 'state.loading' }),
    [],
  );
  const [state, setState] = useState<CapabilityState<Output>>(loading);

  useEffect(() => {
    let active = true;
    setState(loading);
    void service
      .read<Output>(projectId, capability)
      .then((next) => {
        if (active) setState(next);
      })
      .catch(() => {
        if (active) {
          setState({
            status: 'error',
            code: 'CAPABILITY_READ_FAILED',
            messageKey: 'state.error',
            retryable: true,
          });
        }
      });
    return () => {
      active = false;
    };
  }, [capability, inputRevision, loading, projectId, service]);

  return state;
}

export function useCalculationService(): CalculationCapabilityPort {
  const service = useContext(CalculationContext);
  if (service === null) throw new Error('CalculationProvider is required');
  return service;
}
