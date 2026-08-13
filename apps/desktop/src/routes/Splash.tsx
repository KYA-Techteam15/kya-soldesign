import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useCatalog } from '../app/CatalogProvider';

/** Une seule fois par lancement : on ne traverse pas deux fois le démarrage. */
export function Splash() {
  const t = useT();
  const nav = useNavigate();
  const seen = useUi((s) => s.splashSeen);
  const markSeen = useUi((s) => s.markSplashSeen);
  const { summary } = useCatalog();

  useEffect(() => {
    if (seen) {
      void nav('/accueil', { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      markSeen();
      void nav('/accueil', { replace: true });
    }, 1800);
    return () => clearTimeout(timer);
  }, [seen, nav, markSeen]);

  return (
    <div className="splash">
      <div className="mark">
        <i />
        KYA<span>-SolDesign</span>
      </div>
      <p>{t('splash.tagline')}</p>
      <div className="bar">
        <i />
      </div>
      <p className="version">
        {t('splash.loading')} — {summary?.accepted['pv-module'] ?? '—'} modules ·{' '}
        {summary?.accepted.battery ?? '—'} batteries · {summary?.accepted.inverter ?? '—'} onduleurs
      </p>
      <p className="version">{t('splash.prototype')}</p>
    </div>
  );
}
