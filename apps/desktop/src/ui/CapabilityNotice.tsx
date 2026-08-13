import type { CapabilityId, CapabilityState } from '../app/contracts.js';

const CAPABILITY_LABEL: Readonly<Record<CapabilityId, string>> = {
  presizing: 'Prédimensionnement',
  sizing: 'Dimensionnement',
  reliability: 'Fiabilité',
  'equipment-compatibility': 'Compatibilité du matériel',
  protections: 'Protections et câbles',
  finance: 'Chiffrage calculé',
  dossier: 'Dossier calculé',
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
  const className = `cap-notice ${compact ? 'is-compact' : ''}`;
  const label = CAPABILITY_LABEL[capability];

  if (state.status === 'loading') {
    return <div className={className} role="status"><b>{label}</b><span>Lecture de l’état…</span></div>;
  }
  if (state.status === 'error') {
    return <div className={`${className} is-error`} role="alert"><b>{label} indisponible</b><span>Échec de lecture · {state.code}</span></div>;
  }
  if (state.status === 'stale') {
    return <div className={`${className} is-stale`} role="status"><b>Résultat périmé</b><span>Les entrées ont changé depuis le dernier calcul.</span></div>;
  }
  if (state.status === 'empty') {
    return <div className={className} role="status"><b>Aucun résultat</b><span>{label} non exécuté pour ce dossier.</span></div>;
  }
  if (state.status === 'unavailable') {
    return <div className={`${className} is-unavailable`} role="status"><b>{label} indisponible</b><span>Intégration prévue par {state.roadmapOwner}. Aucun résultat n’est simulé.</span></div>;
  }
  return null;
}
