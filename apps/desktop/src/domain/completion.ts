import type { ProjectViewModel } from '../app/models/projectView';
import { translate } from '../i18n';
import type { Lang } from '../store/ui';

export type Level = 'empty' | 'partial' | 'done';
export interface SectionState { level: Level; missing: string[]; meta: string }

/** État d'un calcul tel que les écrans le lisent : absent, à jour, périmé ou invalide. */
export type CalculationFact = 'missing' | 'ready' | 'stale' | 'invalid';

/**
 * Faits de calcul utilisés par le rail, le dossier et l'accueil. Sans eux
 * (accueil, listes), seule l'existence d'un résultat enregistré est connue.
 */
export interface CalculationFacts {
  readonly presizing: CalculationFact;
  readonly sizing: CalculationFact;
  readonly finance: CalculationFact;
  /** Tronçons dont la protection ET le câble sont validés, sur 3. */
  readonly protectionsValid: number;
}

const level = (filled: number, total: number): Level => filled === 0 ? 'empty' : filled === total ? 'done' : 'partial';

function storedFacts(project: ProjectViewModel): CalculationFacts {
  return {
    presizing: project.lastCalculation === null ? 'missing' : 'ready',
    sizing: project.sizingCalculation === null ? 'missing' : (project.sizingCalculation.output as { valid?: boolean }).valid === false ? 'invalid' : 'ready',
    finance: project.sizingCalculation === null ? 'missing' : 'ready',
    protectionsValid: project.protections.filter((choice) => choice.caliberA !== null && choice.type !== null).length,
  };
}

export function sectionStates(project: ProjectViewModel, lang: Lang = 'fr', facts: CalculationFacts = storedFacts(project)): Record<string, SectionState> {
  const t = (key: string) => translate(key, lang);
  const details = project.details;
  const site = project.site;
  const assumptions = project.assumptions;
  const costing = project.costing;
  const profile = project.load.profiles.find((item) => item.id === project.load.activeProfileId);
  const lineCount = project.load.activeMode === 'composed'
    ? project.load.composition?.profiles.length ?? 0
    : (profile?.classic.length ?? 0) + (profile?.inductive.length ?? 0) + (profile?.source === 'hourly' || profile?.source === 'meter' ? 1 : 0);
  const build = (checks: [boolean, string][], meta: string): SectionState => ({
    level: level(checks.filter(([valid]) => valid).length, checks.length),
    missing: checks.filter(([valid]) => !valid).map(([, key]) => t(key)),
    meta,
  });
  const fresh = (fact: CalculationFact, missingKey: string): [boolean, string] => [fact === 'ready', fact === 'stale' ? 'completion.stale' : fact === 'invalid' ? 'completion.invalid' : missingKey];

  return {
    projet: build([
      [Boolean(project.name && project.name !== 'Nouveau projet' && project.name !== 'New project'), 'completion.projectName'],
      [Boolean(details.clientName), 'completion.clientName'],
      [Boolean(details.projectNumber), 'completion.projectNumber'],
      [Boolean(details.projectLocation), 'completion.location'],
    ], details.projectNumber || '—'),
    site: build([
      [Boolean(site.region), 'completion.locality'],
      [site.latitude !== 0 || site.longitude !== 0, 'completion.coordinates'],
      [site.weatherSourceId !== null && site.downloadedSource !== null, 'completion.weather'],
    ], site.weatherSourceId ? t('completion.weatherLinked') : '—'),
    besoins: build([[lineCount > 0, 'completion.noLoad']], `${lineCount} ${t('unit.appliances')}`),
    hypotheses: build([
      [assumptions.systemPr > 0 && assumptions.lcoeGrid > 0 && assumptions.projectLifetime > 0, 'completion.assumptions'],
      fresh(facts.presizing, 'completion.presizingNotRun'),
    ], `PR ${assumptions.systemPr} %`),
    materiel: build([
      [Boolean(project.selection.moduleId && project.selection.batteryId && project.selection.inverterId), 'completion.equipment'],
      fresh(facts.sizing, 'completion.sizingNotRun'),
    ], `${[project.selection.moduleId, project.selection.batteryId, project.selection.inverterId].filter(Boolean).length}/3 ${t('unit.refs')}`),
    protections: build([
      [facts.sizing === 'ready', 'completion.sizingNotRun'],
      [facts.protectionsValid === 3, 'completion.protections'],
    ], `${facts.protectionsValid}/3`),
    chiffrage: build([fresh(facts.finance, 'completion.costingUnavailable')], `${t('unit.vat')} ${costing.tvaPercent} %`),
    dossier: build([
      [Boolean(details.clientName), 'completion.clientName'],
      [facts.finance === 'ready', 'completion.costingUnavailable'],
    ], '—'),
  };
}
