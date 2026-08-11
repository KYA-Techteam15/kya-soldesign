import type { MessageKey } from '../../shared/i18n/index.js';

export const workshopSteps = [
  ['projet', 'workshop.project'],
  ['site', 'workshop.site'],
  ['besoins', 'workshop.needs'],
  ['predimensionnement', 'workshop.presizing'],
  ['materiel', 'workshop.equipment'],
  ['protections', 'workshop.protections'],
  ['finance', 'workshop.finance'],
  ['dossier', 'workshop.dossier'],
] as const satisfies readonly (readonly [string, MessageKey])[];

export type WorkshopStepId = typeof workshopSteps[number][0];

export function isWorkshopStepId(value: string | undefined): value is WorkshopStepId {
  return workshopSteps.some(([id]) => id === value);
}
