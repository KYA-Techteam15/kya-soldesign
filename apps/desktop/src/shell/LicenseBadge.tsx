import { useEffect } from 'react';
import { editionLabel } from '../app/licensing/labels';
import { Link, useNavigate } from 'react-router-dom';
import { useLicense } from '../app/licensing/licenseStore';
import type { LicenseView } from '../app/licensing/licenseService';
import { fill, useT } from '../i18n';
import { useUi } from '../store/ui';

/** Seuils d'alerte avant l'échéance, en jours (spec 012, FR-D5). */
const ALERTS = [30, 7, 1] as const;
const ALERTED_KEY = 'ksd.license.alerted';

type Tone = 'ok' | 'soon' | 'urgent' | 'off';

export function licenseTone(view: LicenseView | null): Tone {
  if (view === null || view.readOnly) return 'off';
  if (view.status === 'grace' || (view.remainingDays ?? 0) <= 7) return 'urgent';
  return (view.remainingDays ?? 0) <= 30 ? 'soon' : 'ok';
}

/** Seuil franchi à signaler, s'il ne l'a pas déjà été pour cette licence. */
export function dueAlert(view: LicenseView | null, alerted: string | null): number | null {
  if (view?.payload == null || view.status !== 'active' || view.remainingDays === null) return null;
  const left = view.remainingDays;
  const threshold = ALERTS.filter((days) => days >= left).at(-1) ?? null;
  if (threshold === null) return null;
  return alerted === `${view.payload.licenseId}:${view.payload.expiresAt}:${threshold}` ? null : threshold;
}

/**
 * Pastille de licence de la barre d'état : édition et jours restants, colorée à l'approche de
 * l'échéance. Chaque seuil (J-30, J-7, J-1) donne une seule notification par licence.
 */
export function LicenseBadge() {
  const t = useT();
  const nav = useNavigate();
  const view = useLicense((state) => state.view);
  const notify = useUi((state) => state.notify);

  useEffect(() => {
    let alerted: string | null = null;
    try { alerted = window.localStorage.getItem(ALERTED_KEY); } catch { /* sans stockage, l'alerte revient à chaque lancement */ }
    const threshold = dueAlert(view, alerted);
    if (threshold === null || view?.payload == null) return;
    try { window.localStorage.setItem(ALERTED_KEY, `${view.payload.licenseId}:${view.payload.expiresAt}:${threshold}`); } catch { /* idem */ }
    notify({
      kind: threshold <= 7 ? 'warning' : 'info',
      title: fill(t((view.remainingDays ?? 0) <= 1 ? 'license.alert.one' : 'license.alert.many'), { count: view.remainingDays ?? 0 }),
      detail: t('license.alert.detail'),
      action: { label: t('license.open'), run: () => { void nav('/reglages#licence'); } },
    });
  }, [nav, notify, t, view]);

  if (view === null) return null;
  const payload = view.payload;
  const label = payload === null
    ? t(`license.status.${view.status}`)
    : view.status === 'active'
      ? `${editionLabel(t, payload.edition)} · ${fill(t('license.daysShort'), { count: view.remainingDays ?? 0 })}`
      : `${editionLabel(t, payload.edition)} · ${t(`license.status.${view.status}`)}`;
  return <Link to="/reglages#licence" className={`license-badge tone-${licenseTone(view)}`} title={t('license.badgeHelp')}>{label}</Link>;
}
