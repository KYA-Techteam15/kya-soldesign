import type { SystemKind } from '@ksd/domain';
import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';
import { createEmptyProjectFile } from '../models/projectAdapters.js';
import type { ProjectSessionPort, UiLocale } from '../contracts.js';

type Clock = () => string;
type IdFactory = () => string;

const defaultClock: Clock = () => new Date().toISOString();
const defaultIdFactory: IdFactory = () => crypto.randomUUID();

export class InMemoryProjects implements ProjectSessionPort {
  private projects: ProjectFileV1[];

  public constructor(
    private readonly now: Clock = defaultClock,
    private readonly createId: IdFactory = defaultIdFactory,
    seed: readonly ProjectFileV1[] = [],
  ) {
    this.projects = seed.map((project) => parseProjectFile(project));
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
    this.projects = [project, ...this.projects];
    return project;
  }

  public replace(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    const index = this.projects.findIndex((current) => current.id === checked.id);
    if (index < 0) return;
    this.projects = this.projects.with(index, checked);
  }

  public add(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    if (this.projects.some((current) => current.id === checked.id)) throw new Error('PROJECT_ALREADY_EXISTS');
    this.projects = [checked, ...this.projects];
  }

  public remove(id: string): void {
    this.projects = this.projects.filter((project) => project.id !== id);
  }
}
