import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { FEATURES } from '../../app/licensing/features';
import { DEMO_KEYS } from '../../app/licensing/adminApi';
import { useLicense } from '../../app/licensing/licenseStore';
import type { LicenseStatus } from '../../app/licensing/licenseService';
import { track } from '../../app/feedback/usage';
import { dateLong } from '../../domain/format';
import { fill, useT } from '../../i18n';
import { useUi } from '../../store/ui';

const STATUS_TONE: Record<LicenseStatus, string> = { active: 'ok', grace: 'warn', none: 'bad', expired: 'bad', offline: 'bad', clock: 'bad', invalid: 'bad' };

/**
 * Licence du poste (spec 012, FR-D5) : édition, formule, temps restant, fonctions ouvertes ;
 * activer une clé, rafraîchir auprès de la plateforme, libérer le poste.
 */
export function LicenseSection() {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const { ask, notify } = useUi();
  const { view, busy, activate, refresh, release } = useLicense();
  const [key, setKey] = useState('');
  const payload = view?.payload ?? null;
  const hash = useLocation().hash;
  const sectionRef = useRef<HTMLElement>(null);
  // Arrivée depuis la pastille ou une alerte : la licence se présente d'emblée.
  useEffect(() => { if (hash === '#licence') sectionRef.current?.scrollIntoView({ block: 'start' }); }, [hash]);

  const report = (error: string | null, success: string) => {
    if (error === null) notify({ kind: 'success', title: t(success) });
    else notify({ kind: 'error', title: t('license.failed'), detail: t(`license.error.${error}`) });
  };
  const submit = async () => {
    if (key.trim() === '') return;
    const error = await activate(key);
    report(error, 'license.activated');
    if (error === null) track('license.activate', { edition: useLicense.getState().view?.payload?.edition ?? 'unknown' });
    if (error === null) setKey('');
  };
  const confirmRelease = () => ask({
    title: t('license.releaseTitle'),
    message: t('license.releaseMessage'),
    confirmLabel: t('license.release'),
    danger: true,
    onConfirm: () => { void release().then(() => notify({ kind: 'info', title: t('license.released') })); },
  });

  return (
    <section className="kpis settings-group license-group" id="licence" ref={sectionRef}>
      <div className="kpi kpi-head"><span className="h-sec">{t('settings.license')}</span></div>
      <div className="kpi">
        <span>{t('license.status')}</span>
        <span className={`badge ${STATUS_TONE[view?.status ?? 'none']}`}>{t(`license.status.${view?.status ?? 'none'}`)}</span>
      </div>
      {payload && <>
        <div className="kpi"><span>{t('license.edition')}</span><b>{t(`license.edition.${payload.edition}`)} · {t(`license.plan.${payload.plan}`)}</b></div>
        <div className="kpi"><span>{t('license.holder')}</span><span className="label">{payload.customer}</span></div>
        <div className="kpi">
          <span>{t('license.period')}</span>
          <span className="label">{fill(t('license.periodValue'), { start: dateLong(payload.startsAt, lang), end: dateLong(payload.expiresAt, lang) })}</span>
        </div>
        <div className="kpi">
          <span>{t('license.remaining')}</span>
          <b>{view?.status === 'grace' && view.graceUntil
            ? fill(t('license.graceUntil'), { date: dateLong(view.graceUntil, lang) })
            : fill(t(view?.remainingDays === 1 ? 'license.daysOne' : 'license.days'), { count: view?.remainingDays ?? 0 })}</b>
        </div>
        <div className="kpi">
          <span>{t('license.features')}</span>
          <ul className="license-features">
            {FEATURES.map((feature) => {
              const open = payload.features.includes(feature);
              return <li key={feature} className={open ? 'is-open' : 'is-closed'}><span aria-hidden="true">{open ? '✓' : '—'}</span> {t(`license.feature.${feature}`)}</li>;
            })}
          </ul>
        </div>
        <div className="kpi">
          <span>{t('license.limits')}</span>
          <span className="label">
            {payload.limits.maxProjects === null ? t('license.projectsUnlimited') : fill(t('license.projectsMax'), { count: payload.limits.maxProjects })}
            {payload.watermark !== null && <> · {t('license.watermarkForced')}</>}
          </span>
        </div>
        {view?.lastVerifiedAt && <div className="kpi"><span>{t('license.verified')}</span><span className="label">{dateLong(view.lastVerifiedAt, lang)}</span></div>}
      </>}
      {view?.readOnly && <div className="kpi"><p className="generate-warning" role="status">{t(`license.readOnly.${view.status}`)}</p></div>}
      <div className="kpi">
        <span>{t('license.key')}<small className="label asset-help">{t('license.keyHelp')}</small></span>
        <span className="asset-actions">
          <input className="cell-in settings-input license-key" value={key} placeholder="KYA-XXX-XX-XXXX" aria-label={t('license.key')} onChange={(event) => setKey(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void submit(); }} />
          <button type="button" className="btn btn-primary" disabled={busy || key.trim() === ''} onClick={() => { void submit(); }}>{t('license.activate')}</button>
        </span>
      </div>
      <div className="kpi">
        <span>{t('license.platform')}<small className="label asset-help">{t('license.platformHelp')}</small></span>
        <span className="asset-actions">
          <button type="button" className="btn" disabled={busy || payload === null} onClick={() => { void refresh().then((error) => report(error, 'license.refreshed')); }}>{t('license.refresh')}</button>
          <button type="button" className="btn" disabled={busy || payload === null} onClick={confirmRelease}>{t('license.release')}</button>
        </span>
      </div>
      <details className="kpi license-demo">
        <summary>{t('license.demoTitle')}</summary>
        <p className="label">{t('license.demoHelp')}</p>
        <div className="license-demo-keys">
          {Object.entries(DEMO_KEYS).map(([demoKey, demo]) => (
            <button key={demoKey} type="button" className="btn btn-ghost" onClick={() => setKey(demoKey)}>
              <code>{demoKey}</code> <span className="label">{t(`license.edition.${demo.edition}`)} · {t(`license.plan.${demo.plan}`)}</span>
            </button>
          ))}
        </div>
      </details>
    </section>
  );
}
