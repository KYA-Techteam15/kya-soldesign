import { parseProjectFile, type IssuedVersionV1, type ProjectFileV1 } from '@ksd/project-format';
import type { ProjectViewModel } from './projectView.js';

/**
 * Cycle de vie d'un dossier (spec 011, FR-008 → FR-011).
 *
 * Brouillon → En cours → Prêt à émettre → Émis vN → Révision vN+1. « Émettre » fige une version ;
 * le dossier reste alors en lecture seule jusqu'à « Créer une révision ». Les versions émises ne
 * changent plus : leurs documents se régénèrent depuis leur instantané.
 */
export type ProjectStatus = 'draft' | 'in-progress' | 'ready' | 'issued' | 'revision';

/** Filtres de l'accueil ; « Périmés » est transversal (calcul à relancer). */
export type ProjectFilter = 'all' | 'in-progress' | 'ready' | 'issued' | 'stale';

export function latestVersion(project: Pick<ProjectViewModel, 'issue'>): IssuedVersionV1 | null {
  return project.issue.versions.at(-1) ?? null;
}

/** Numéro de la prochaine version à émettre. */
export function nextVersionNumber(project: Pick<ProjectViewModel, 'issue'>): number {
  return (latestVersion(project)?.number ?? 0) + 1;
}

export function isLocked(project: Pick<ProjectViewModel, 'issue'> | null | undefined): boolean {
  return project?.issue.locked === true;
}

/**
 * État affiché. Un dossier émis le reste tant qu'on ne le révise pas ; sinon l'avancement décide,
 * et un dossier déjà émis une fois est « en révision » tant qu'il n'est pas prêt à être réémis.
 */
export function projectStatus(project: Pick<ProjectViewModel, 'issue'>, progress: { readonly done: number; readonly total: number }): ProjectStatus {
  if (project.issue.locked) return 'issued';
  if (progress.done === progress.total) return 'ready';
  if (project.issue.versions.length > 0) return 'revision';
  return progress.done === 0 ? 'draft' : 'in-progress';
}

export function matchesFilter(status: ProjectStatus, stale: boolean, filter: ProjectFilter): boolean {
  switch (filter) {
    case 'all': return true;
    case 'stale': return stale;
    case 'issued': return status === 'issued';
    case 'ready': return status === 'ready';
    case 'in-progress': return status === 'draft' || status === 'in-progress' || status === 'revision';
  }
}

/** Fige l'état actuel du dossier en version N+1 et le verrouille. */
export function issueProject(project: ProjectFileV1, now = new Date().toISOString()): ProjectFileV1 {
  if (project.issue?.locked === true) throw new Error('PROJECT_ALREADY_ISSUED');
  const versions = project.issue?.versions ?? [];
  const inputs = project.inputs as { details?: { projectNumber?: unknown } };
  const version: IssuedVersionV1 = {
    number: (versions.at(-1)?.number ?? 0) + 1,
    issuedAt: now,
    reference: typeof inputs.details?.projectNumber === 'string' ? inputs.details.projectNumber : '',
    snapshot: {
      name: project.name,
      inputs: structuredClone(project.inputs),
      selectedEquipmentIds: [...project.selectedEquipmentIds],
      lastCalculation: project.lastCalculation,
      sizingCalculation: project.sizingCalculation ?? null,
    },
    fingerprints: {
      presizing: project.lastCalculation?.inputHash ?? null,
      sizing: project.sizingCalculation?.inputHash ?? null,
    },
  };
  return parseProjectFile({ ...project, updatedAt: now, issue: { locked: true, versions: [...versions, version] } });
}

/** Ouvre la révision N+1 : le dossier redevient modifiable, les versions émises restent intactes. */
export function reviseProject(project: ProjectFileV1, now = new Date().toISOString()): ProjectFileV1 {
  if (project.issue?.locked !== true) throw new Error('PROJECT_NOT_ISSUED');
  return parseProjectFile({ ...project, updatedAt: now, issue: { ...project.issue, locked: false } });
}

const SNAPSHOT_SEPARATOR = '~v';

/** Identifiant de lecture d'une version émise ; jamais enregistré comme projet. */
export function issuedSnapshotId(projectId: string, versionNumber: number): string {
  return `${projectId}${SNAPSHOT_SEPARATOR}${versionNumber}`;
}

export function isIssuedSnapshotId(id: string): boolean {
  return id.includes(SNAPSHOT_SEPARATOR);
}

/**
 * Projet reconstitué depuis une version émise, pour régénérer ses documents à l'identique.
 * `null` si l'identifiant ne désigne pas une version connue.
 */
export function resolveIssuedSnapshot(projects: readonly ProjectFileV1[], id: string): ProjectFileV1 | null {
  const at = id.lastIndexOf(SNAPSHOT_SEPARATOR);
  if (at < 0) return null;
  const project = projects.find((item) => item.id === id.slice(0, at));
  const version = project?.issue?.versions.find((item) => item.number === Number(id.slice(at + SNAPSHOT_SEPARATOR.length)));
  if (project === undefined || version === undefined) return null;
  return {
    ...project,
    id,
    name: version.snapshot.name,
    updatedAt: version.issuedAt,
    inputs: version.snapshot.inputs,
    selectedEquipmentIds: version.snapshot.selectedEquipmentIds,
    lastCalculation: version.snapshot.lastCalculation,
    sizingCalculation: version.snapshot.sizingCalculation,
    issue: { locked: true, versions: [version] },
  };
}
