/**
 * Complétude réelle des sections.
 *
 * Un voyant vert qui ne vérifie rien est pire que pas de voyant : il donne une
 * fausse assurance. Chaque section dit ce qui lui manque, en trois états.
 */

import { engine } from '../engine';
import type { Project } from './types';
import { translate } from '../i18n';
import type { Lang } from '../store/ui';

export type Level = 'empty' | 'partial' | 'done';

export interface SectionState {
  level: Level;
  /** Ce qui manque, en clair. Vide si complet. */
  missing: string[];
  /** Repère affiché à droite dans l'arbre. */
  meta: string;
}

const level = (filled: number, total: number): Level =>
  filled === 0 ? 'empty' : filled === total ? 'done' : 'partial';

export function sectionStates(
  project: Project,
  lang: Lang = 'fr',
): Record<string, SectionState> {
  const u = (key: string) => translate(key, lang);
  const d = project.details;
  const s = project.site;
  const a = project.assumptions;
  const k = project.costing;
  const balance = engine.loadBalance(project);
  const sizing = engine.size(project);

  // --- Projet & client
  const projetChecks: [boolean, string][] = [
    [Boolean(project.name && project.name !== 'Nouveau projet'), 'nom du projet'],
    [Boolean(d.clientName), 'nom du client'],
    [Boolean(d.projectNumber), 'numéro de dossier'],
    [Boolean(d.projectLocation), 'localisation'],
  ];

  // --- Site & climat
  const siteChecks: [boolean, string][] = [
    [Boolean(s.region), 'localité'],
    [s.latitude !== 0 || s.longitude !== 0, 'coordonnées'],
    [s.irradiation > 0, 'irradiation'],
    [s.monthlyIrradiation.some((v) => v > 0), 'irradiation mensuelle'],
  ];

  // --- Besoins
  const profile = project.load.profiles.find(
    (p) => p.id === project.load.activeProfileId,
  );
  const lineCount = (profile?.classic.length ?? 0) + (profile?.inductive.length ?? 0);
  const besoinsChecks: [boolean, string][] = [
    [balance.dailyEnergyWh > 0, 'aucune charge saisie'],
    [balance.peakPowerW > 0, 'puissance de pointe nulle'],
  ];

  // --- Hypothèses : ce sont les valeurs qui rendent le calcul possible
  const hypChecks: [boolean, string][] = [
    [a.systemPr > 0, 'performance ratio'],
    [a.batteryDod > 0, 'profondeur de décharge'],
    [a.projectLifetime > 0, 'durée de vie du projet'],
    [a.lcoeGrid > 0, 'tarif réseau de référence'],
    [a.pvSpecificCost > 0 && a.batterySpecificCost > 0 && a.inverterSpecificCost > 0, 'coûts spécifiques'],
  ];

  // --- Matériel
  const matChecks: [boolean, string][] = [
    [Boolean(project.selection.moduleId), 'module'],
    [Boolean(project.selection.batteryId), 'batterie'],
    [Boolean(project.selection.inverterId), 'onduleur'],
  ];

  // --- Protections : les longueurs saisies ET les contraintes satisfaites
  const okConstraints = sizing.constraints.filter((c) => c.satisfied).length;
  const protChecks: [boolean, string][] = [
    [project.cables.every((c) => c.length > 0), 'longueurs de câble'],
    [
      sizing.constraints.length > 0 && okConstraints === sizing.constraints.length,
      `${sizing.constraints.length - okConstraints} contrainte(s) non satisfaite(s)`,
    ],
  ];

  // --- Chiffrage
  const chiffChecks: [boolean, string][] = [
    [k.moduleUnitPrice > 0 && k.batteryUnitPrice > 0 && k.inverterUnitPrice > 0, 'prix de revient'],
    [k.tvaPercent >= 0, 'TVA'],
  ];

  // --- Rapport & synoptique
  // Le SVI ne conditionne rien. `computeSVI` renvoie LCOE / tarif réseau : au
  // delà de 1, le kWh solaire coûte plus cher que le réseau *de ce pays cette
  // année-là*, ce qui n'empêche ni un site isolé ni un client qui décarbone.
  // Le moteur Python ne bloque pas non plus — `viable` n'y est qu'un booléen
  // du dictionnaire de résultat.
  const verdict = engine.verdict(project);
  const dossierChecks: [boolean, string][] = [
    [Boolean(d.clientName), 'nom du client sur la page de garde'],
  ];

  const build = (checks: [boolean, string][], meta: string): SectionState => ({
    level: level(checks.filter(([ok]) => ok).length, checks.length),
    missing: checks.filter(([ok]) => !ok).map(([, label]) => label),
    meta,
  });

  return {
    projet: build(projetChecks, d.projectNumber || '—'),
    site: build(siteChecks, s.irradiation > 0 ? s.irradiation.toFixed(2) : '—'),
    besoins: build(besoinsChecks, `${lineCount} ${u('unit.appliances')}`),
    hypotheses: build(hypChecks, `PR ${a.systemPr} %`),
    materiel: build(
      matChecks,
      `${matChecks.filter(([ok]) => ok).length}/3 ${u('unit.refs')}`,
    ),
    protections: build(
      protChecks,
      `${okConstraints}/${sizing.constraints.length}`,
    ),
    chiffrage: build(chiffChecks, `${u('unit.vat')} ${k.tvaPercent} %`),
    /* Le SVI n'existe qu'après le prédimensionnement. Avant, `computeSVI`
       divise deux zéros et l'arbre annonçait « SVI 0.00 » sur un dossier
       qu'on venait d'ouvrir — un verdict rendu sans étude. */
    dossier: build(
      dossierChecks,
      s.irradiation > 0 && lineCount > 0 ? `SVI ${verdict.svi.toFixed(2)}` : '—',
    ),
  };
}
