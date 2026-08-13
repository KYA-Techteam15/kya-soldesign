import type { CapabilityId, CapabilityState } from '../app/contracts.js';
import { useT } from '../i18n';

const CAPABILITY_LABEL: Readonly<Record<CapabilityId, string>> = {
  presizing: 'Prédimensionnement',
  sizing: 'Dimensionnement',
  reliability: 'Fiabilité',
  'equipment-compatibility': 'Compatibilité du matériel',
  protections: 'Protections et câbles',
  finance: 'Chiffrage calculé',
  dossier: 'Dossier calculé',
};

const CAPABILITY_LABEL_EN: Readonly<Record<CapabilityId, string>> = {
  presizing: 'Pre-sizing', sizing: 'Sizing', reliability: 'Reliability',
  'equipment-compatibility': 'Equipment compatibility', protections: 'Protections and cables',
  finance: 'Calculated costing', dossier: 'Calculated file',
};

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
  const english = t('app.back') === 'Back';
  const className = `cap-notice ${compact ? 'is-compact' : ''}`;
  const label = (english ? CAPABILITY_LABEL_EN : CAPABILITY_LABEL)[capability];

  if (state.status === 'loading') {
    return <div className={className} role="status"><b>{label}</b><span>{t('capability.loading')}</span></div>;
  }
  if (state.status === 'error') {
    return <div className={`${className} is-error`} role="alert"><b>{label} {t('g.unavailable')}</b><span>{t('capability.readError')} · {state.code}</span></div>;
  }
  if (state.status === 'stale') {
    return <div className={`${className} is-stale`} role="status"><b>{t('capability.stale')}</b><span>{t('capability.staleHelp')}</span></div>;
  }
  if (state.status === 'empty') {
    return <div className={className} role="status"><b>{t('g.none')}</b><span>{label} {t('capability.notRun')}</span></div>;
  }
  if (state.status === 'unavailable') {
    return <div className={`${className} is-unavailable`} role="status"><b>{label} {t('g.unavailable')}</b><span>{t('capability.planned')} {state.roadmapOwner}. {t('capability.noSimulation')}</span></div>;
  }
  return null;
}
