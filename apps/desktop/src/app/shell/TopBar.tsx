import { useNavigate } from 'react-router-dom';
import type { ProjectFileV1 } from '@ksd/project-format';
import { useApplication } from '../ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';

interface TopBarProps {
  readonly project?: ProjectFileV1 | null;
  readonly primary?: { readonly label: string; readonly onClick: () => void };
  readonly back?: string;
}

export function TopBar({ project, primary, back }: TopBarProps) {
  const { locale, setLocale, theme, toggleTheme } = useApplication();
  const navigate = useNavigate();
  const t = useT();
  return <header className="topbar">
    <button className="wordmark" onClick={() => navigate('/accueil')} title={t('home.title')}>
      <i aria-hidden="true" /> KYA<span>-SolDesign</span>
    </button>
    <div className="crumbs">
      {back ? <button className="btn btn-ghost" onClick={() => navigate(back)}>← {t('action.back')}</button> : null}
      {project ? <><b>{project.name}</b><span className="ref">n° {project.id.slice(0, 8)}</span></> : null}
    </div>
    <button className="btn btn-ghost" title={t('palette.title')} onClick={() => window.dispatchEvent(new Event('ksd:palette'))}>
      {t('app.search')} <span className="kbd">Ctrl K</span>
    </button>
    <button className="btn btn-ghost" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={locale === 'fr' ? 'Switch to English' : 'Passer au français'}>{locale.toUpperCase()}</button>
    <button className="btn btn-ghost" onClick={toggleTheme}>{theme === 'light' ? t('app.darkMode') : t('app.lightMode')}</button>
    {primary ? <button className="btn btn-primary" onClick={primary.onClick}>{primary.label}</button> : null}
  </header>;
}
