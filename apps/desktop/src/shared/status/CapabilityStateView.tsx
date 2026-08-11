import type { ReactNode } from 'react';
import type { CapabilityState } from '../../app/contracts.js';
import { useT } from '../i18n/index.js';

export function CapabilityStateView({ state, children }: { readonly state: CapabilityState<ReactNode>; readonly children?: ReactNode }) {
  const t = useT();
  if (state.status === 'ready') return <>{children}</>;
  if (state.status === 'unavailable') {
    return <section className="state-panel unavailable" role="status"><h2>{t('state.unavailable')}</h2><p>{t('state.owner')} {state.roadmapOwner}.</p></section>;
  }
  if (state.status === 'error') return <section className="state-panel" role="alert"><h2>{t('state.error')}</h2><p>{state.code}</p></section>;
  if (state.status === 'loading') return <section className="state-panel" role="status"><h2>{t('state.loading')}</h2></section>;
  if (state.status === 'stale') return <section className="state-panel" role="status"><h2>{t('state.stale')}</h2></section>;
  return <section className="state-panel" role="status"><h2>{t('state.empty')}</h2></section>;
}
