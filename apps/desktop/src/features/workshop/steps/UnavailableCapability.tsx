import { useEffect, useState, type ReactNode } from 'react';
import type { CapabilityId, CapabilityState } from '../../../app/contracts.js';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT, type MessageKey } from '../../../shared/i18n/index.js';
import { CapabilityStateView } from '../../../shared/status/CapabilityStateView.js';

export function UnavailableCapability({ projectId, capability, titleKey, children }: { readonly projectId: string; readonly capability: CapabilityId; readonly titleKey: MessageKey; readonly children?: ReactNode }) {
  const { services } = useApplication();
  const t = useT();
  const [state, setState] = useState<CapabilityState<ReactNode>>({ status: 'loading', messageKey: 'state.loading' });
  useEffect(() => { let active = true; void services.calculations.read<ReactNode>(projectId, capability).then((result) => { if (active) setState(result); }).catch(() => { if (active) setState({ status: 'error', code: 'CAPABILITY_READ_FAILED', messageKey: 'state.error', retryable: false }); }); return () => { active = false; }; }, [capability, projectId, services]);
  return <section className="work-card"><h2>{t(titleKey)}</h2>{children}<p>{t('workshop.unavailableDetail')}</p><CapabilityStateView state={state}>{null}</CapabilityStateView></section>;
}
