import { createContext, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import type { ProjectFileV1 } from '@ksd/project-format';
import { CanonicalCatalog } from './adapters/canonicalCatalog.js';
import { InMemoryProjects } from './adapters/inMemoryProjects.js';
import { unavailableCalculations } from './adapters/unavailableCalculations.js';
import type { ApplicationServices, UiLocale } from './contracts.js';

export type UiTheme = 'light' | 'dark';

interface ApplicationContextValue {
  readonly services: ApplicationServices;
  readonly locale: UiLocale;
  readonly setLocale: (locale: UiLocale) => void;
  readonly theme: UiTheme;
  readonly toggleTheme: () => void;
  readonly projects: readonly ProjectFileV1[];
  readonly currentProjectId: string | null;
  readonly setCurrentProjectId: (id: string | null) => void;
  readonly refreshProjects: () => void;
  readonly createProject: () => ProjectFileV1;
  readonly removeProject: (id: string) => void;
  readonly updateProject: (project: ProjectFileV1) => void;
}

const ApplicationContext = createContext<ApplicationContextValue | null>(null);

export function ApplicationProvider({ children, services: providedServices }: { readonly children: ReactNode; readonly services?: ApplicationServices }) {
  const [projectRevision, refresh] = useReducer((value: number) => value + 1, 0);
  const [locale, setLocale] = useState<UiLocale>('fr');
  const [theme, setTheme] = useState<UiTheme>('light');
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const services = useMemo<ApplicationServices>(() => providedServices ?? ({
    projects: new InMemoryProjects(),
    catalog: new CanonicalCatalog(),
    calculations: unavailableCalculations,
  }), [providedServices]);

  const value = useMemo<ApplicationContextValue>(() => ({
    services,
    locale,
    setLocale,
    theme,
    toggleTheme: () => setTheme((current) => current === 'light' ? 'dark' : 'light'),
    projects: services.projects.list(),
    currentProjectId,
    setCurrentProjectId,
    refreshProjects: refresh,
    createProject: () => {
      const project = services.projects.create('standalone-all-in-one', locale);
      refresh();
      return project;
    },
    removeProject: (id) => { services.projects.remove(id); refresh(); },
    updateProject: (project) => { services.projects.replace(project); refresh(); },
  }), [currentProjectId, locale, projectRevision, services, theme]);

  return <ApplicationContext.Provider value={value}>{children}</ApplicationContext.Provider>;
}

export function useApplication(): ApplicationContextValue {
  const context = useContext(ApplicationContext);
  if (context === null) throw new Error('ApplicationProvider is required');
  return context;
}
