import type { ProjectViewModel } from './projectView.js';
import type { CalculationFacts } from '../../domain/completion.js';

export type DocumentKind = 'rapport' | 'offre' | 'proforma' | 'dossier_exec';
export interface DocumentIssue { readonly code: string; readonly fieldPath: string; readonly messageKey: string }
export interface DocumentReadiness { readonly documentKind: DocumentKind; readonly blockers: readonly DocumentIssue[]; readonly warnings: readonly DocumentIssue[] }

export interface ReadinessInput {
  readonly project: ProjectViewModel;
  readonly kind: DocumentKind;
  readonly facts: CalculationFacts;
  /** Le document contient-il des montants ? Sans eux, le chiffrage n'est pas requis. */
  readonly withPrices: boolean;
  /** Nom de l'entreprise émettrice (réglages). */
  readonly companyName: string;
}

/**
 * Contrôle unique avant impression ET avant export Word : un document remis au
 * client ne sort jamais avec un système périmé, incomplet ou des montants absents.
 */
export function assessDocumentReadiness(input: ReadinessInput): DocumentReadiness {
  const { project, kind, facts, withPrices } = input;
  const blockers: DocumentIssue[] = []; const warnings: DocumentIssue[] = [];
  const clientFacing = kind === 'rapport' || kind === 'proforma';
  if (!project.name.trim()) blockers.push(issue('PROJECT_NAME_MISSING', 'name', 'documents.readiness.projectNameMissing'));
  if (!project.selection.moduleId || !project.selection.batteryId || !project.selection.inverterId) blockers.push(issue('EQUIPMENT_MISSING', 'selection', 'documents.readiness.equipmentMissing'));
  if (facts.sizing === 'stale') blockers.push(issue('SIZING_STALE', 'sizing', 'documents.readiness.sizingStale'));
  else if (facts.sizing !== 'ready') blockers.push(issue('SIZING_MISSING', 'sizing', 'documents.readiness.sizingMissing'));
  const needsFinance = kind === 'proforma' || withPrices;
  if (needsFinance && facts.finance === 'stale') blockers.push(issue('FINANCE_STALE', 'finance', 'documents.readiness.financeStale'));
  else if (needsFinance && facts.finance !== 'ready') blockers.push(issue('FINANCE_MISSING', 'finance', 'documents.readiness.financeMissing'));
  if (!project.details.clientName.trim()) (kind === 'proforma' ? blockers : warnings).push(issue('CLIENT_MISSING', 'details.clientName', 'documents.readiness.clientMissing'));
  if (clientFacing && kind !== 'proforma' && facts.protectionsValid < 3) warnings.push(issue('PROTECTIONS_INCOMPLETE', 'protections', 'documents.readiness.protectionsIncomplete'));
  if (!input.companyName.trim()) warnings.push(issue('COMPANY_MISSING', 'settings.company.name', 'documents.readiness.companyMissing'));
  if (!project.details.projectNumber.trim()) warnings.push(issue('REFERENCE_MISSING', 'details.projectNumber', 'documents.readiness.referenceMissing'));
  if (!project.details.projectLocation.trim() && !project.site.region.trim()) warnings.push(issue('LOCATION_MISSING', 'details.projectLocation', 'documents.readiness.locationMissing'));
  if (!project.details.followerName.trim()) warnings.push(issue('OFFICER_MISSING', 'details.followerName', 'documents.readiness.officerMissing'));
  return { documentKind: kind, blockers, warnings };
}

function issue(code: string, fieldPath: string, messageKey: string): DocumentIssue { return { code, fieldPath, messageKey }; }
