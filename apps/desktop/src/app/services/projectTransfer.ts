import type { ProjectFileV1 } from '@ksd/project-format';
import type { ProjectFileTransferPort, ProjectSessionPort } from '../contracts.js';
import { duplicateProject, inspectProjectImport, serializeProject, type ImportInspection } from '../models/projectTransfer.js';

export class ProjectTransferService {
  public constructor(private readonly projects: Pick<ProjectSessionPort, 'list' | 'get' | 'add' | 'replace'>, private readonly files: ProjectFileTransferPort, private readonly applicationVersion = '0.1.0') {}
  public async export(id: string): Promise<void> { const project = this.projects.get(id); if (!project) throw new Error('PROJECT_EXPORT_NOT_FOUND'); await this.files.saveTextFile({ filename: safeFilename(project), mimeType: 'application/json', text: serializeProject(project, this.applicationVersion) }); }
  public async inspectImport(): Promise<{ readonly fileName: string; readonly inspection: ImportInspection } | null> { const file = await this.files.pickTextFile({ accept: 'application/json,.json,.ksd.json' }); return file ? { fileName: file.name, inspection: inspectProjectImport(file.text, this.projects.list()) } : null; }
  public commitImport(inspection: ImportInspection, decision: 'replace' | 'copy' | 'cancel'): ProjectFileV1 | null { if (inspection.status === 'invalid' || decision === 'cancel') return null; const project = decision === 'copy' ? duplicateProject(inspection.project) : inspection.project; if (decision === 'copy' || inspection.status === 'valid-new') this.projects.add(project); else this.projects.replace(project); return project; }
  public duplicate(id: string): ProjectFileV1 { const project = this.projects.get(id); if (!project) throw new Error('PROJECT_DUPLICATE_NOT_FOUND'); const copy = duplicateProject(project); this.projects.add(copy); return copy; }
}

function safeFilename(project: ProjectFileV1): string { const raw = project.name.trim() || project.id; return `KYA-SolDesign_${raw.replace(/[^a-z0-9_-]+/giu, '_')}.ksd.json`; }
