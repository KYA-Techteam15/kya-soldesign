import type { CableSizingResult, FinanceOutputV1, PresizingOutputV1, SizingOutputV1 } from '@ksd/engine';
import { useCalculationState } from '../CalculationProvider.js';
import { useCatalog } from '../CatalogProvider.js';
import { projectProtections } from '../diagram/projectDiagram.js';
import type { CapabilityState } from '../contracts.js';
import type { ProjectViewModel } from '../models/projectView.js';
import type { CalculationFact, CalculationFacts } from '../../domain/completion.js';

/** Section calculée sur le calibre retenu : une section provisoire ne valide pas le tronçon. */
const isConfirmedCable = (cable: CableSizingResult | undefined): boolean => cable?.state === 'valid' && !cable.provisional;

function fact(state: CapabilityState<unknown>, valid = true): CalculationFact {
  if (state.status === 'ready') return valid ? 'ready' : 'invalid';
  return state.status === 'stale' ? 'stale' : 'missing';
}

/**
 * Faits de calcul d'un projet, lus aux mêmes sources que les écrans : le rail,
 * le dossier et les étapes ne peuvent plus afficher « validé » sur un résultat
 * périmé ou sur des protections incomplètes.
 */
export function useCalculationFacts(project: ProjectViewModel): { readonly facts: CalculationFacts; readonly sizing: SizingOutputV1 | null; readonly finance: FinanceOutputV1 | null; readonly presizing: PresizingOutputV1 | null } {
  const { equipment } = useCatalog();
  const presizingState = useCalculationState<PresizingOutputV1>(project.id, 'presizing', project.updatedAt);
  const sizingState = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const financeState = useCalculationState<FinanceOutputV1>(project.id, 'finance', project.updatedAt);
  const sizing = sizingState.status === 'ready' ? sizingState.envelope.output : null;
  const { protections, cables } = projectProtections(project, sizing?.valid ? sizing : null, equipment);
  const protectionsValid = protections.filter((protection) => protection.state === 'valid' && isConfirmedCable(cables.find((cable) => cable.segment === protection.segment))).length;
  return {
    facts: {
      presizing: fact(presizingState),
      sizing: fact(sizingState, sizing?.valid ?? false),
      finance: fact(financeState),
      protectionsValid,
    },
    sizing: sizing?.valid ? sizing : null,
    finance: financeState.status === 'ready' ? financeState.envelope.output : null,
    presizing: presizingState.status === 'ready' ? presizingState.envelope.output : null,
  };
}
