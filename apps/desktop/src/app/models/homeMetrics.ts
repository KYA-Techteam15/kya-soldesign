import type { Lang } from '../../store/ui';
import { sectionStates } from '../../domain/completion';
import type { ProjectViewModel } from './projectView';

/**
 * Chiffres de l'accueil.
 *
 * Ils viennent des études de l'utilisateur, jamais d'un décor : une page qui
 * annonce des résultats qu'on n'a pas produits ment. Tant que rien n'est
 * dimensionné, la grandeur vaut `null` et l'écran le dit, au lieu d'afficher un
 * zéro qui ressemblerait à un bilan.
 */

/** Les sept étapes de l'atelier, dans l'ordre du parcours. */
export const WORKSHOP_STEPS: readonly string[] = [
  'projet',
  'site',
  'besoins',
  'hypotheses',
  'materiel',
  'protections',
  'chiffrage',
];

export interface StudioMetrics {
  readonly projects: number;
  readonly clients: number;
  /** Puissance photovoltaïque cumulée des études dimensionnées, en kWc. */
  readonly pvKwc: number | null;
  /** Stockage utile cumulé des études dimensionnées, en kWh. */
  readonly storageKwh: number | null;
  /** Nombre d'études effectivement dimensionnées. */
  readonly sized: number;
}

interface SizingShape {
  readonly pv?: { readonly obtainedPowerKwc?: unknown };
  readonly battery?: { readonly usefulEnergyKwh?: unknown };
}

const finite = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;

/** Lit le dimensionnement mémorisé d'un projet, sans lui faire confiance. */
export function sizedFigures(project: ProjectViewModel): { pvKwc: number | null; storageKwh: number | null } {
  const output = project.sizingCalculation?.output as SizingShape | undefined;
  return {
    pvKwc: finite(output?.pv?.obtainedPowerKwc),
    storageKwh: finite(output?.battery?.usefulEnergyKwh),
  };
}

/** Agrège les études ouvertes dans la session. */
export function studioMetrics(projects: readonly ProjectViewModel[]): StudioMetrics {
  let pv = 0;
  let storage = 0;
  let sized = 0;
  const clients = new Set<string>();

  for (const project of projects) {
    const name = project.details.clientName.trim();
    if (name) clients.add(name.toLocaleLowerCase());
    const figures = sizedFigures(project);
    if (figures.pvKwc !== null || figures.storageKwh !== null) sized += 1;
    pv += figures.pvKwc ?? 0;
    storage += figures.storageKwh ?? 0;
  }

  return {
    projects: projects.length,
    clients: clients.size,
    pvKwc: sized === 0 ? null : pv,
    storageKwh: sized === 0 ? null : storage,
    sized,
  };
}

export interface ProjectProgress {
  readonly done: number;
  readonly total: number;
  /** Première étape non terminée : c'est là que l'utilisateur s'est arrêté. */
  readonly nextStep: string | null;
}

/** Avancement d'une étude, mesuré sur les règles de l'atelier. */
export function projectProgress(project: ProjectViewModel, lang: Lang = 'fr'): ProjectProgress {
  const states = sectionStates(project, lang);
  let done = 0;
  let nextStep: string | null = null;
  for (const step of WORKSHOP_STEPS) {
    if (states[step]?.level === 'done') done += 1;
    else if (nextStep === null) nextStep = step;
  }
  return { done, total: WORKSHOP_STEPS.length, nextStep };
}
