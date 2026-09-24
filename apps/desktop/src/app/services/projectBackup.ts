import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';

/** Sauvegarde complète : tous les projets, versionnée pour une restauration contrôlée. */
export interface ProjectBackupV1 {
  readonly backupVersion: 1;
  readonly exportedAtIso: string;
  readonly applicationVersion: string;
  readonly projects: readonly ProjectFileV1[];
}

export interface RestorePlan {
  readonly added: readonly ProjectFileV1[];
  /** Projets présents dont la sauvegarde est plus récente. */
  readonly replaced: readonly ProjectFileV1[];
  /** Projets identiques ou plus récents sur le poste : conservés tels quels. */
  readonly kept: number;
  readonly unreadable: number;
}

export function serializeBackup(projects: readonly ProjectFileV1[], applicationVersion: string, now = new Date().toISOString()): string {
  return JSON.stringify({ backupVersion: 1, exportedAtIso: now, applicationVersion, projects } satisfies ProjectBackupV1);
}

/**
 * Prépare une restauration sans rien écrire : un projet absent est ajouté, un
 * projet plus récent dans la sauvegarde remplace la version du poste, et un
 * projet modifié depuis sur le poste n'est jamais écrasé.
 */
export function planRestore(text: string, existing: readonly ProjectFileV1[]): RestorePlan {
  const document = JSON.parse(text) as Partial<ProjectBackupV1>;
  if (document.backupVersion !== 1 || !Array.isArray(document.projects)) throw new Error('BACKUP_INVALID');
  const added: ProjectFileV1[] = []; const replaced: ProjectFileV1[] = []; let kept = 0; let unreadable = 0;
  for (const candidate of document.projects) {
    let project: ProjectFileV1;
    try { project = parseProjectFile(candidate); } catch { unreadable += 1; continue; }
    const current = existing.find((item) => item.id === project.id);
    if (!current) added.push(project);
    else if (project.updatedAt > current.updatedAt) replaced.push(project);
    else kept += 1;
  }
  return { added, replaced, kept, unreadable };
}
