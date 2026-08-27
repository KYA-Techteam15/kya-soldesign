import type { SystemKind } from '@ksd/domain';
import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';
import { createEmptyProjectFile } from '../models/projectAdapters.js';
import type { ProjectSessionPort, UiLocale } from '../contracts.js';

type Clock = () => string;
type IdFactory = () => string;
type ProjectStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const PROJECTS_STORAGE_KEY = 'kya-sol-design.projects.v1';
const defaultClock: Clock = () => new Date().toISOString();
const defaultIdFactory: IdFactory = () => crypto.randomUUID();

interface StoredProjectsV1 {
  readonly version: 1;
  readonly projects: readonly unknown[];
}

export class BrowserProjects implements ProjectSessionPort {
  private projects: ProjectFileV1[];

  public constructor(
    private readonly storage: ProjectStorage = window.localStorage,
    private readonly now: Clock = defaultClock,
    private readonly createId: IdFactory = defaultIdFactory,
  ) {
    this.projects = readProjects(storage);
  }

  public list(): readonly ProjectFileV1[] {
    return this.projects;
  }

  public get(id: string): ProjectFileV1 | null {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  public create(system: SystemKind, locale: UiLocale): ProjectFileV1 {
    const timestamp = this.now();
    const project = createEmptyProjectFile(
      this.createId(),
      system,
      timestamp,
      locale === 'fr' ? 'Nouveau projet' : 'New project',
    );
    this.commit([project, ...this.projects]);
    return project;
  }

  public replace(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    const index = this.projects.findIndex((current) => current.id === checked.id);
    if (index < 0) return;
    this.commit(this.projects.with(index, checked));
  }

  public add(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    if (this.projects.some((current) => current.id === checked.id)) throw new Error('PROJECT_ALREADY_EXISTS');
    this.commit([checked, ...this.projects]);
  }

  public remove(id: string): void {
    this.commit(this.projects.filter((project) => project.id !== id));
  }

  private commit(projects: ProjectFileV1[]): void {
    this.storage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify({ version: 1, projects } satisfies StoredProjectsV1));
    this.projects = projects;
  }
}

function readProjects(storage: ProjectStorage): ProjectFileV1[] {
  try {
    const raw = storage.getItem(PROJECTS_STORAGE_KEY);
    if (raw === null) return [];
    const stored = JSON.parse(raw) as Partial<StoredProjectsV1>;
    if (stored.version !== 1 || !Array.isArray(stored.projects)) return [];
    return stored.projects.flatMap((candidate) => {
      try { return [parseProjectFile(candidate)]; } catch { return []; }
    });
  } catch {
    return [];
  }
}
