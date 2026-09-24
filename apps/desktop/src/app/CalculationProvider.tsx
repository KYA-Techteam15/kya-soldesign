import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { ProjectFileV1 } from '@ksd/project-format';
import type {
  CalculationCapabilityPort,
  CapabilityId,
  CapabilityState,
} from './contracts.js';
import { unavailableCalculations } from './adapters/unavailableCalculations.js';
import { AioCalculations } from './adapters/aioCalculations.js';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import { useProjectSession } from './ProjectSessionProvider.js';
import { resolveIssuedSnapshot } from './models/projectLifecycle.js';

const CalculationContext = createContext<CalculationCapabilityPort | null>(null);

/**
 * Le service de calcul est créé une fois les référentiels chargés, puis reste
 * stable : il lit les projets par référence. Le recréer à chaque frappe relançait
 * toutes les lectures de calcul des écrans ouverts.
 */
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
  const projectsRef = useRef<readonly ProjectFileV1[]>(session.canonicalProjects);
  const replaceRef = useRef(session.replaceCanonical);
  projectsRef.current = session.canonicalProjects;
  replaceRef.current = session.replaceCanonical;
  useEffect(() => {
    let active = true;
    void loadReferences(catalog).then((next) => { if (active) setReferences(next); });
    return () => { active = false; };
  }, [catalog]);
  const defaultService = useMemo<CalculationCapabilityPort>(() => references === null ? unavailableCalculations : new AioCalculations(
    (id) => projectsRef.current.find((project) => project.id === id) ?? resolveIssuedSnapshot(projectsRef.current, id),
    references,
    (project) => replaceRef.current(project),
  ), [references]);
  return (
    <CalculationContext.Provider value={service ?? defaultService}>
      {children}
    </CalculationContext.Provider>
  );
}

async function loadReferences(catalog: CanonicalCatalog) {
  const [localities, weatherSources, loadProfiles, equipment] = await Promise.all([
    catalog.listLocalities(), catalog.listWeatherSources(), catalog.listLoadProfiles(), catalog.list(),
  ]);
  return { localities, weatherSources, loadProfiles, equipment };
}

const LOADING = { status: 'loading', messageKey: 'state.loading' } as const;
const READ_GROUPING_MS = 150;

/**
 * État d'une capacité de calcul. Pendant un recalcul, la dernière valeur reste
 * affichée : un écran ne repasse pas par « — » à chaque frappe. L'état
 * « chargement » n'apparaît qu'à la première lecture d'un projet.
 */
export function useCalculationState<Output>(
  projectId: string,
  capability: CapabilityId,
  inputRevision?: string,
): CapabilityState<Output> {
  const service = useContext(CalculationContext);
  if (service === null) throw new Error('CalculationProvider is required');
  const key = `${projectId}:${capability}`;
  const [state, setState] = useState<{ readonly key: string; readonly value: CapabilityState<Output> }>({ key, value: LOADING });

  const hasValue = state.key === key;
  useEffect(() => {
    let active = true;
    // Pendant une saisie, les relectures sont regroupées : seule la dernière
    // révision d'une rafale de frappes est recalculée.
    const timer = setTimeout(() => {
      void service
        .read<Output>(projectId, capability)
        .then((next) => { if (active) setState({ key, value: next }); })
        .catch(() => {
          if (active) setState({ key, value: { status: 'error', code: 'CAPABILITY_READ_FAILED', messageKey: 'state.error', retryable: true } });
        });
    }, hasValue ? READ_GROUPING_MS : 0);
    return () => { active = false; clearTimeout(timer); };
  }, [capability, inputRevision, key, projectId, service]);

  return state.key === key ? state.value : LOADING;
}

export function useCalculationService(): CalculationCapabilityPort {
  const service = useContext(CalculationContext);
  if (service === null) throw new Error('CalculationProvider is required');
  return service;
}
