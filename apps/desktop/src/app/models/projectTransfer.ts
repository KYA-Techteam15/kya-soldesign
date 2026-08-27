import { parseProjectFile, type ProjectFileV1 } from '@ksd/project-format';

export interface ProjectTransferEnvelopeV1 { readonly transferVersion: 1; readonly exportedAtIso: string; readonly applicationVersion: string; readonly project: ProjectFileV1; }
export type ImportInspection = { readonly status: 'valid-new'; readonly project: ProjectFileV1 } | { readonly status: 'valid-conflict'; readonly project: ProjectFileV1; readonly sameContent: boolean } | { readonly status: 'invalid'; readonly code: string };

export function serializeProject(project: ProjectFileV1, applicationVersion = '0.1.0', now = new Date().toISOString()): string { return JSON.stringify({ transferVersion: 1, exportedAtIso: now, applicationVersion, project } satisfies ProjectTransferEnvelopeV1, null, 2); }
export function parseProjectTransfer(value: unknown): ProjectFileV1 {
  if (typeof value !== 'object' || value === null) throw new Error('PROJECT_IMPORT_INVALID_JSON');
  const candidate = 'project' in value ? (value as { project?: unknown }).project : value;
  return parseProjectFile(candidate);
}
export function duplicateProject(project: ProjectFileV1, idFactory = () => crypto.randomUUID(), now = () => new Date().toISOString()): ProjectFileV1 {
  const timestamp = now(); return parseProjectFile({ ...project, id: idFactory(), name: `${project.name} · copie`, createdAt: timestamp, updatedAt: timestamp });
}
export function inspectProjectImport(text: string, existing: readonly ProjectFileV1[]): ImportInspection {
  try { const project = parseProjectTransfer(JSON.parse(text)); const current = existing.find((item) => item.id === project.id); if (!current) return { status: 'valid-new', project }; return { status: 'valid-conflict', project, sameContent: JSON.stringify(current) === JSON.stringify(project) }; } catch (error) { return { status: 'invalid', code: error instanceof Error ? error.message : 'PROJECT_IMPORT_INVALID' }; }
}
