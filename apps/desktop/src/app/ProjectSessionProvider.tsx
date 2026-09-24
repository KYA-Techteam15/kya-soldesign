import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { ProjectSessionPort, UiLocale } from './contracts.js';
import { InMemoryProjects } from './adapters/inMemoryProjects.js';
import type { SaveState } from './persistence/persistentProjects.js';
import {
  projectFileToView,
  projectViewToFile,
  systemTypeToCanonical,
} from './models/projectAdapters.js';
import type { ProjectViewModel, SystemType } from './models/projectView.js';
import { applyProjectDefaults } from './services/createProject.js';
import { readNavigationSession, writeNavigationSession } from './navigationSession.js';
import { useSettings } from '../store/settings.js';

type ProjectMutation = (draft: ProjectViewModel) => void;

/** Port de session optionnellement durable : l'état d'enregistrement est alors observable. */
export type ObservableProjectSessionPort = ProjectSessionPort & {
  readonly subscribe?: (listener: () => void) => () => void;
  readonly getSaveState?: () => SaveState;
  readonly retry?: () => Promise<void>;
};

interface ProjectHistory { readonly past: readonly ProjectViewModel[]; readonly future: readonly ProjectViewModel[] }

interface ProjectSessionContextValue {
  readonly projects: readonly ProjectViewModel[];
  readonly canonicalProjects: readonly ProjectFileV1[];
  readonly currentId: string | null;
  readonly saveState: SaveState;
  readonly retrySave: () => void;
  readonly validationErrors: Readonly<Record<string, string>>;
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly current: () => ProjectViewModel | null;
  readonly open: (id: string) => void;
  readonly create: (system: SystemType) => string;
  /** Supprime et renvoie la restauration exacte du projet, pour l'action « Annuler ». */
  readonly remove: (id: string) => (() => void) | null;
  readonly update: (mutate: ProjectMutation) => void;
  readonly replaceCanonical: (project: ProjectFileV1) => void;
  readonly addCanonical: (project: ProjectFileV1) => void;
}

const ProjectSessionContext = createContext<ProjectSessionContextValue | null>(null);
const HISTORY_LIMIT = 50;
/** Frappes successives regroupées en une seule étape d'annulation. */
const HISTORY_COALESCE_MS = 800;
const MEMORY_SAVE_STATE: SaveState = { status: 'saved', pending: 0, lastSavedAt: null, error: null, unreadable: 0 };
const noopSubscribe = () => () => undefined;

function filesToViews(files: readonly ProjectFileV1[]): ProjectViewModel[] {
  return files.map((project) => projectFileToView(project));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PROJECT_INPUT_INVALID';
}

/**
 * Copie de travail d'un projet. La série météo horaire (8 760 points) est
 * toujours remplacée d'un bloc, jamais modifiée sur place : elle est partagée
 * entre les versions plutôt que recopiée à chaque frappe et à chaque étape
 * d'annulation.
 */
function cloneProject(view: ProjectViewModel): ProjectViewModel {
  const source = view.site.downloadedSource;
  const irradiance = source?.hourlyIrradiance;
  if (source === null || irradiance === undefined) return structuredClone(view);
  const { hourlyIrradiance: _shared, ...rest } = source;
  const copy = structuredClone({ ...view, site: { ...view.site, downloadedSource: rest } }) as ProjectViewModel;
  copy.site.downloadedSource!.hourlyIrradiance = irradiance;
  return copy;
}

export function ProjectSessionProvider({
  children,
  service: providedService,
  locale = 'fr',
}: {
  readonly children: ReactNode;
  readonly service?: ObservableProjectSessionPort;
  readonly locale?: UiLocale;
}) {
  const service = useMemo<ObservableProjectSessionPort>(() => providedService ?? new InMemoryProjects(), [providedService]);
  const [projects, setProjects] = useState<ProjectViewModel[]>(() => filesToViews(service.list()));
  const [canonicalProjects, setCanonicalProjects] = useState<readonly ProjectFileV1[]>(() => service.list());
  const [currentId, setCurrentId] = useState<string | null>(() => readNavigationSession(service.list()).currentProjectId);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [histories, setHistories] = useState<Readonly<Record<string, ProjectHistory>>>({});
  const lastHistoryPush = useRef<{ id: string; at: number } | null>(null);
  const saveState = useSyncExternalStore(service.subscribe ?? noopSubscribe, service.getSaveState ?? (() => MEMORY_SAVE_STATE));

  const projectsRef = useRef(projects);
  useEffect(() => { projectsRef.current = projects; }, [projects]);

  /** Écrit un seul projet, puis publie la liste canonique à jour. */
  const persist = useCallback((view: ProjectViewModel): boolean => {
    try {
      service.replace(projectViewToFile(view));
      setCanonicalProjects(service.list());
      setValidationErrors((errors) => { if (!(view.id in errors)) return errors; const { [view.id]: _removed, ...remaining } = errors; return remaining; });
      return true;
    } catch (error) {
      setValidationErrors((errors) => ({ ...errors, [view.id]: errorMessage(error) }));
      return false;
    }
  }, [service]);

  const replaceView = useCallback((next: ProjectViewModel) => {
    setProjects((current) => current.map((project) => (project.id === next.id ? next : project)));
    persist(next);
  }, [persist]);

  const pushHistory = useCallback((previous: ProjectViewModel) => {
    const now = Date.now();
    const last = lastHistoryPush.current;
    lastHistoryPush.current = { id: previous.id, at: now };
    if (last !== null && last.id === previous.id && now - last.at < HISTORY_COALESCE_MS) return;
    setHistories((all) => {
      const history = all[previous.id] ?? { past: [], future: [] };
      return { ...all, [previous.id]: { past: [...history.past, previous].slice(-HISTORY_LIMIT), future: [] } };
    });
  }, []);

  const step = useCallback((direction: 'undo' | 'redo') => {
    if (currentId === null) return;
    const present = projectsRef.current.find((project) => project.id === currentId);
    const history = histories[currentId];
    if (!present || !history) return;
    const source = direction === 'undo' ? history.past : history.future;
    const target = source.at(-1);
    if (!target) return;
    lastHistoryPush.current = null;
    setHistories((all) => ({
      ...all,
      [currentId]: direction === 'undo'
        ? { past: history.past.slice(0, -1), future: [...history.future, present] }
        : { past: [...history.past, present], future: history.future.slice(0, -1) },
    }));
    replaceView(target);
  }, [currentId, histories, replaceView]);

  const create = useCallback((system: SystemType): string => {
    const file = service.create(systemTypeToCanonical(system), locale);
    const view = projectFileToView(applyProjectDefaults(file, useSettings.getState()));
    persist(view);
    setProjects((current) => [view, ...current]);
    setCurrentId(file.id);
    return file.id;
  }, [locale, persist, service]);

  const remove = useCallback((id: string): (() => void) | null => {
    const file = service.get(id);
    if (file === null) return null;
    service.remove(id);
    setCanonicalProjects(service.list());
    setProjects((current) => current.filter((project) => project.id !== id));
    setHistories((all) => { const { [id]: _removed, ...rest } = all; return rest; });
    setCurrentId((current) => (current === id ? null : current));
    return () => {
      service.add(file);
      setCanonicalProjects(service.list());
      setProjects((current) => [projectFileToView(file), ...current]);
    };
  }, [service]);

  const update = useCallback((mutate: ProjectMutation) => {
    if (currentId === null) return;
    const present = projectsRef.current.find((project) => project.id === currentId);
    if (!present) return;
    const draft = cloneProject(present);
    mutate(draft);
    draft.updatedAt = new Date().toISOString();
    pushHistory(present);
    projectsRef.current = projectsRef.current.map((project) => (project.id === draft.id ? draft : project));
    setProjects(projectsRef.current);
    persist(draft);
  }, [currentId, persist, pushHistory]);

  const value = useMemo<ProjectSessionContextValue>(() => ({
    projects,
    canonicalProjects,
    currentId,
    saveState,
    retrySave: () => { void service.retry?.(); },
    validationErrors,
    canUndo: () => currentId !== null && (histories[currentId]?.past.length ?? 0) > 0,
    canRedo: () => currentId !== null && (histories[currentId]?.future.length ?? 0) > 0,
    undo: () => step('undo'),
    redo: () => step('redo'),
    current: () => projects.find((project) => project.id === currentId) ?? null,
    open: (id) => {
      setCurrentId(id);
      const session = readNavigationSession(service.list());
      writeNavigationSession({ ...session, currentProjectId: service.get(id) ? id : null });
    },
    create,
    remove,
    update,
    replaceCanonical: (project) => {
      service.replace(project);
      setCanonicalProjects(service.list());
      const view = projectFileToView(service.get(project.id) ?? project);
      projectsRef.current = projectsRef.current.some((item) => item.id === view.id)
        ? projectsRef.current.map((item) => (item.id === view.id ? view : item))
        : [view, ...projectsRef.current];
      setProjects(projectsRef.current);
    },
    addCanonical: (project) => {
      service.add(project);
      setCanonicalProjects(service.list());
      setProjects(filesToViews(service.list()));
    },
  }), [canonicalProjects, create, currentId, histories, projects, remove, saveState, service, step, update, validationErrors]);

  return <ProjectSessionContext.Provider value={value}>{children}</ProjectSessionContext.Provider>;
}

export function useProjectSession(): ProjectSessionContextValue {
  const context = useContext(ProjectSessionContext);
  if (context === null) throw new Error('ProjectSessionProvider is required');
  return context;
}
