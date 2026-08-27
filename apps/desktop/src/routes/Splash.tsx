import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../i18n';
import { useUi } from '../store/ui';
import { useCatalog } from '../app/CatalogProvider';
import { useProjects } from '../store/project';
import { readNavigationSession } from '../app/navigationSession';

/** Une seule fois par lancement : on ne traverse pas deux fois le démarrage. */
export function Splash() {
  const t = useT();
  const nav = useNavigate();
  const seen = useUi((s) => s.splashSeen);
  const markSeen = useUi((s) => s.markSplashSeen);
  const { summary } = useCatalog();
  const projects = useProjects((s) => s.projects);

  useEffect(() => {
    const session = readNavigationSession(projects);
    const destination = session.route && projects.some((project) => project.id === session.currentProjectId)
      ? session.route + session.search
      : '/accueil';
    if (seen) {
      void nav(destination, { replace: true });
      return;
    }
    const timer = setTimeout(() => {
      markSeen();
      void nav(destination, { replace: true });
    }, 1800);
    return () => clearTimeout(timer);
  }, [seen, nav, markSeen, projects]);

  return (
    <div className="splash">
      <img className="splash-logo" src="/kya-sol-design-logo.png" alt="KYA-SolDesign" />
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
