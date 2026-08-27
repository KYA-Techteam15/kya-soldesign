import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { ProjectFileV1 } from '@ksd/project-format';
import type { ProjectSessionPort, UiLocale } from './contracts.js';
import { BrowserProjects } from './adapters/browserProjects.js';
import {
  projectFileToView,
  projectViewToFile,
  systemTypeToCanonical,
} from './models/projectAdapters.js';
import type { ProjectViewModel, SystemType } from './models/projectView.js';
import { readNavigationSession, writeNavigationSession } from './navigationSession.js';
import { useSettings } from '../store/settings.js';

type ProjectMutation = (draft: ProjectViewModel) => void;

interface ProjectSessionContextValue {
  readonly projects: readonly ProjectViewModel[];
  readonly canonicalProjects: readonly ProjectFileV1[];
  readonly currentId: string | null;
  readonly savedAt: number;
  readonly validationErrors: Readonly<Record<string, string>>;
  readonly past: readonly (readonly ProjectViewModel[])[];
  readonly future: readonly (readonly ProjectViewModel[])[];
  readonly canUndo: () => boolean;
  readonly canRedo: () => boolean;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly current: () => ProjectViewModel | null;
  readonly open: (id: string) => void;
  readonly create: (system: SystemType) => string;
  readonly remove: (id: string) => void;
  readonly update: (mutate: ProjectMutation) => void;
  readonly touchSaved: () => void;
  readonly replaceCanonical: (project: ProjectFileV1) => void;
}

const ProjectSessionContext = createContext<ProjectSessionContextValue | null>(null);

function filesToViews(files: readonly ProjectFileV1[]): ProjectViewModel[] {
  return files.map((project) => projectFileToView(project));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'PROJECT_INPUT_INVALID';
}

export function ProjectSessionProvider({
  children,
  service: providedService,
  locale = 'fr',
}: {
  readonly children: ReactNode;
  readonly service?: ProjectSessionPort;
  readonly locale?: UiLocale;
}) {
  const service = useMemo(() => providedService ?? new BrowserProjects(), [providedService]);
  const [projects, setProjects] = useState<ProjectViewModel[]>(() => filesToViews(service.list()));
  const [currentId, setCurrentId] = useState<string | null>(() => readNavigationSession(service.list()).currentProjectId);
  const [savedAt, setSavedAt] = useState(() => Date.now());
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [past, setPast] = useState<readonly ProjectViewModel[][]>([]);
  const [future, setFuture] = useState<readonly ProjectViewModel[][]>([]);

  const replaceViews = useCallback((next: ProjectViewModel[]) => {
    for (const view of next) service.replace(projectViewToFile(view));
    setProjects(next);
    setSavedAt(Date.now());
  }, [service]);

  const undo = useCallback(() => {
    setPast((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      setFuture((redoHistory) => [...redoHistory, projects].slice(-50));
      replaceViews(structuredClone(previous));
      return history.slice(0, -1);
    });
  }, [projects, replaceViews]);

  const redo = useCallback(() => {
    setFuture((history) => {
      const next = history.at(-1);
      if (!next) return history;
      setPast((undoHistory) => [...undoHistory, projects].slice(-50));
      replaceViews(structuredClone(next));
      return history.slice(0, -1);
    });
  }, [projects, replaceViews]);

  const create = useCallback((system: SystemType): string => {
    const file = service.create(systemTypeToCanonical(system), locale);
    const view = projectFileToView(file);
    const defaults = useSettings.getState();
    view.assumptions.systemPr = defaults.performanceRatioPercent;
    view.assumptions.lpspMax = defaults.maxLpspPercent;
    view.assumptions.lolpMax = defaults.maxLolpPercent;
    view.assumptions.inverterYield = defaults.inverterEfficiencyPercent;
    view.assumptions.batteryYield = defaults.batteryEfficiencyPercent;
    view.assumptions.batteryVoltage = defaults.batteryVoltage;
    view.assumptions.pvSpecificCost = defaults.pvSpecificCost;
    view.assumptions.batterySpecificCost = defaults.batterySpecificCost;
    view.assumptions.inverterSpecificCost = defaults.inverterSpecificCost;
    view.assumptions.pvMargin = defaults.pvMarginPercent;
    view.assumptions.batteryMargin = defaults.batteryMarginPercent;
    view.assumptions.inverterMargin = defaults.inverterMarginPercent;
    view.costing.tvaPercent = defaults.vatPercent;
    view.costing.offerValidity = defaults.offerValidityDays;
    view.costing.productWarranty = defaults.warrantyMonths;
    view.costing.deliveryTime = defaults.deliveryDays;
    view.costing.reductionPercent = defaults.discountPercent;
    view.costing.downPaymentPercent = defaults.downPaymentPercent;
    view.currency = defaults.currencyCode;
    service.replace(projectViewToFile(view));
    setPast((history) => [...history, projects].slice(-50));
    setFuture([]);
    setProjects([view, ...projects]);
    setCurrentId(file.id);
    setSavedAt(Date.now());
    return file.id;
  }, [locale, projects, service]);

  const remove = useCallback((id: string) => {
    service.remove(id);
    setPast((history) => [...history, projects].slice(-50));
    setFuture([]);
    setProjects((current) => current.filter((project) => project.id !== id));
    setCurrentId((current) => current === id ? null : current);
    setSavedAt(Date.now());
  }, [projects, service]);

  const update = useCallback((mutate: ProjectMutation) => {
    if (currentId === null) return;
    const next = structuredClone(projects);
    const index = next.findIndex((project) => project.id === currentId);
    const draft = next[index];
    if (!draft) return;
    mutate(draft);
    draft.updatedAt = new Date().toISOString();
    setPast((history) => [...history, projects].slice(-50));
    setFuture([]);
    setProjects(next);
    try {
      service.replace(projectViewToFile(draft));
      setValidationErrors((errors) => {
        const { [currentId]: _removed, ...remaining } = errors;
        return remaining;
      });
      setSavedAt(Date.now());
    } catch (error) {
      setValidationErrors((errors) => ({ ...errors, [currentId]: errorMessage(error) }));
    }
  }, [currentId, projects, service]);

  const value = useMemo<ProjectSessionContextValue>(() => ({
    projects,
    canonicalProjects: service.list(),
    currentId,
    savedAt,
    validationErrors,
    past,
    future,
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
    undo,
    redo,
    current: () => projects.find((project) => project.id === currentId) ?? null,
    open: (id) => {
      setCurrentId(id);
      const session = readNavigationSession(service.list());
      writeNavigationSession({ ...session, currentProjectId: service.get(id) ? id : null });
    },
    create,
    remove,
    update,
    touchSaved: () => setSavedAt(Date.now()),
    replaceCanonical: (project) => {
      service.replace(project);
      setProjects(filesToViews(service.list()));
      setSavedAt(Date.now());
    },
  }), [create, currentId, future, past, projects, redo, remove, savedAt, service, undo, update, validationErrors]);

  return <ProjectSessionContext.Provider value={value}>{children}</ProjectSessionContext.Provider>;
}

export function useProjectSession(): ProjectSessionContextValue {
  const context = useContext(ProjectSessionContext);
  if (context === null) throw new Error('ProjectSessionProvider is required');
  return context;
}
