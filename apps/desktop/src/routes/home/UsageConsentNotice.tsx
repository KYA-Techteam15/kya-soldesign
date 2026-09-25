import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { useUsage } from '../../app/feedback/usage';

/**
 * Consentement à l'usage anonyme (spec 012, FR-F1) : demandé une fois, sans bloquer l'accueil,
 * et modifiable ensuite dans Réglages → Avis et assistance.
 */
export function UsageConsentNotice() {
  const t = useT();
  const consent = useUsage((state) => state.consent);
  const setConsent = useUsage((state) => state.setConsent);
  if (consent !== null) return null;
  return (
    <div className="alert info usage-consent" role="note">
      <div>
        <b>{t('usage.consentTitle')}</b> {t('usage.consentLead')} <Link to="/reglages#avis">{t('usage.consentMore')}</Link>
      </div>
      <span className="usage-consent-actions">
        <button className="btn" onClick={() => setConsent('denied')}>{t('usage.decline')}</button>
        <button className="btn btn-primary" onClick={() => setConsent('granted')}>{t('usage.accept')}</button>
      </span>
    </div>
  );
}
