import type { SystemKind } from '@ksd/domain';
import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';
import type { ProjectSessionPort, UiLocale } from '../contracts.js';

type Clock = () => string;

const defaultClock: Clock = () => new Date().toISOString();

export class InMemoryProjects implements ProjectSessionPort {
  private projects: ProjectFileV1[] = [];

  public constructor(private readonly now: Clock = defaultClock) {}

  public list(): readonly ProjectFileV1[] {
    return this.projects;
  }

  public get(id: string): ProjectFileV1 | null {
    return this.projects.find((project) => project.id === id) ?? null;
  }

  public create(system: SystemKind, locale: UiLocale): ProjectFileV1 {
    const timestamp = this.now();
    const project = parseProjectFile({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name: locale === 'fr' ? 'Nouvelle étude AIO' : 'New AIO study',
      system,
      createdAt: timestamp,
      updatedAt: timestamp,
      inputs: {},
      selectedEquipmentIds: [],
      lastCalculation: null,
    });
    this.projects = [project, ...this.projects];
    return project;
  }

  public replace(project: ProjectFileV1): void {
    const checked = parseProjectFile(project);
    const index = this.projects.findIndex((current) => current.id === checked.id);
    if (index < 0) return;
    this.projects = this.projects.with(index, checked);
  }

  public remove(id: string): void {
    this.projects = this.projects.filter((project) => project.id !== id);
  }
}
