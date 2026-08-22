import type { ProjectViewModel } from '../app/models/projectView';
import { translate } from '../i18n';
import type { Lang } from '../store/ui';

export type Level = 'empty' | 'partial' | 'done';
export interface SectionState { level: Level; missing: string[]; meta: string }

const level = (filled: number, total: number): Level => filled === 0 ? 'empty' : filled === total ? 'done' : 'partial';

export function sectionStates(project: ProjectViewModel, lang: Lang = 'fr'): Record<string, SectionState> {
  const unit = (key: string) => translate(key, lang);
  const details = project.details;
  const site = project.site;
  const assumptions = project.assumptions;
  const costing = project.costing;
  const profile = project.load.profiles.find((item) => item.id === project.load.activeProfileId);
  const lineCount = (profile?.classic.length ?? 0) + (profile?.inductive.length ?? 0);
  const configuredCables = project.cables.filter((cable) => cable.length > 0).length;
  const selectedProtections = project.protections.filter((choice) => choice.caliberA !== null).length;
  const build = (checks: [boolean, string][], meta: string): SectionState => ({
    level: level(checks.filter(([valid]) => valid).length, checks.length),
    missing: checks.filter(([valid]) => !valid).map(([, label]) => label),
    meta,
  });

  return {
    projet: build([
      [Boolean(project.name && project.name !== 'Nouveau projet'), 'nom du projet'],
      [Boolean(details.clientName), 'nom du client'],
      [Boolean(details.projectNumber), 'numéro de dossier'],
      [Boolean(details.projectLocation), 'localisation'],
    ], details.projectNumber || '—'),
    site: build([
      [Boolean(site.region), 'localité'],
      [site.latitude !== 0 || site.longitude !== 0, 'coordonnées'],
      [site.weatherSourceId !== null, 'source météo'],
    ], site.weatherSourceId ? 'météo liée' : '—'),
    besoins: build([[lineCount > 0, 'aucune charge saisie']], `${lineCount} ${unit('unit.appliances')}`),
    hypotheses: build([
      [assumptions.systemPr > 0, 'performance ratio'],
      [assumptions.batteryDod > 0, 'profondeur de décharge'],
      [assumptions.projectLifetime > 0, 'durée de vie du projet'],
      [assumptions.lcoeGrid > 0, 'tarif réseau de référence'],
    ], `PR ${assumptions.systemPr} %`),
    materiel: build([
      [Boolean(project.selection.moduleId), 'module'],
      [Boolean(project.selection.batteryId), 'batterie'],
      [Boolean(project.selection.inverterId), 'onduleur'],
    ], `${[project.selection.moduleId, project.selection.batteryId, project.selection.inverterId].filter(Boolean).length}/3 ${unit('unit.refs')}`),
    protections: build([
      [project.cables.length === 3 && configuredCables === 3, 'longueurs de câble'],
      [project.protections.length === 3 && selectedProtections === 3, 'calibres retenus'],
    ], ''),
    chiffrage: build([
      [costing.moduleUnitPrice > 0 && costing.batteryUnitPrice > 0 && costing.inverterUnitPrice > 0, 'prix de revient'],
      [costing.tvaPercent >= 0, 'TVA'],
    ], `${unit('unit.vat')} ${costing.tvaPercent} %`),
    dossier: build([[Boolean(details.clientName), 'nom du client sur la page de garde']], '—'),
  };
}
