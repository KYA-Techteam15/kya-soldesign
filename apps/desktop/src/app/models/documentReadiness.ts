import type { FinanceOutputV1, SizingOutputV1 } from '@ksd/engine';
import type { ProjectViewModel } from './projectView.js';

export type DocumentKind = 'rapport' | 'offre' | 'proforma' | 'dossier_exec';
export interface DocumentIssue { readonly code: string; readonly fieldPath: string; readonly messageKey: string }
export interface DocumentReadiness { readonly documentKind: DocumentKind; readonly blockers: readonly DocumentIssue[]; readonly warnings: readonly DocumentIssue[] }

export function assessDocumentReadiness(project: ProjectViewModel, kind: DocumentKind, sizing: SizingOutputV1 | null, finance: FinanceOutputV1 | null): DocumentReadiness {
  const blockers: DocumentIssue[] = []; const warnings: DocumentIssue[] = [];
  if (!project.name.trim()) blockers.push(issue('PROJECT_NAME_MISSING', 'name', 'documents.readiness.projectNameMissing'));
  if (kind === 'proforma' && finance === null) blockers.push(issue('FINANCE_MISSING', 'finance', 'documents.readiness.financeMissing'));
  if (kind !== 'offre' && sizing === null) warnings.push(issue('SIZING_MISSING', 'sizing', 'documents.readiness.sizingMissing'));
  if (!project.details.clientName.trim()) warnings.push(issue('CLIENT_MISSING', 'details.clientName', 'documents.readiness.clientMissing'));
  if (!project.details.projectNumber.trim()) warnings.push(issue('REFERENCE_MISSING', 'details.projectNumber', 'documents.readiness.referenceMissing'));
  if (!project.details.projectLocation.trim() && !project.site.region.trim()) warnings.push(issue('LOCATION_MISSING', 'details.projectLocation', 'documents.readiness.locationMissing'));
  if (!project.selection.moduleId || !project.selection.batteryId || !project.selection.inverterId) warnings.push(issue('EQUIPMENT_MISSING', 'selection', 'documents.readiness.equipmentMissing'));
  return { documentKind: kind, blockers, warnings };
}

function issue(code: string, fieldPath: string, messageKey: string): DocumentIssue { return { code, fieldPath, messageKey }; }
