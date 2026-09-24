import type { Lang } from '../../store/ui';
import { sectionStates } from '../../domain/completion';
import type { ProjectViewModel } from './projectView';

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
