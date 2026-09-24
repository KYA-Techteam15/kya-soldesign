import type { CapabilityId, CapabilityState } from '../app/contracts.js';
import { calculationErrorKey } from '../app/models/calculationErrors.js';
import { translate, useT } from '../i18n';
import { useUi } from '../store/ui';

/**
 * État d'une capacité de calcul non disponible, avec sa raison : un résultat
 * absent dit pourquoi (étape manquante, entrée périmée, erreur), jamais « — » seul.
 */
export function CapabilityNotice({
  capability,
  state,
  compact = false,
}: {
  readonly capability: CapabilityId;
  readonly state: CapabilityState<unknown>;
  readonly compact?: boolean;
}) {
  const t = useT();
  const lang = useUi((ui) => ui.lang);
  const className = `cap-notice ${compact ? 'is-compact' : ''}`;
  const label = t(`capability.name.${capability}`);

  if (state.status === 'loading') {
    return <div className={className} role="status"><b>{label}</b><span>{t('capability.loading')}</span></div>;
  }
  if (state.status === 'error') {
    return <div className={`${className} is-error`} role="alert"><b>{label} {t('g.unavailable')}</b><span>{t('capability.readError')} · {state.code}</span></div>;
  }
  if (state.status === 'stale') {
    const reason = translate(state.reasonKey, lang);
    return <div className={`${className} is-stale`} role="status"><b>{t('capability.stale')}</b><span>{reason === state.reasonKey ? t('capability.staleHelp') : reason}</span></div>;
  }
  if (state.status === 'empty') {
    // Les codes moteur (« SIZING_NOT_RUN ») disent ce qui manque ; les clés, un texte prêt.
    const reason = /^[A-Z0-9_,]+$/u.test(state.messageKey) ? t(calculationErrorKey(state.messageKey)) : null;
    return <div className={className} role="status"><b>{t('g.none')}</b><span>{reason !== null && reason !== t('calc.unknown') ? reason : `${label} ${t('capability.notRun')}`}</span></div>;
  }
  if (state.status === 'unavailable') {
    return <div className={`${className} is-unavailable`} role="status"><b>{label} {t('g.unavailable')}</b><span>{t('capability.planned')} {state.roadmapOwner}. {t('capability.noSimulation')}</span></div>;
  }
  return null;
}
