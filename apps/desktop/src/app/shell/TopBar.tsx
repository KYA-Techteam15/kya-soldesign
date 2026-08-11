import { Link, useNavigate } from 'react-router-dom';
import { useApplication } from '../ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';

export function TopBar({ onOpenPalette }: { readonly onOpenPalette: () => void }) {
  const { locale, setLocale, theme, toggleTheme, createProject, setCurrentProjectId } = useApplication();
  const navigate = useNavigate();
  const t = useT();
  const createStudy = () => {
    const project = createProject();
    setCurrentProjectId(project.id);
    void navigate(`/projet/${project.id}/atelier/projet`);
  };
  return <header className="topbar">
    <Link className="brand" to="/accueil" aria-label={t('app.name')}><span className="brand-mark" aria-hidden="true"><span/><span/></span><span>KYA <span className="brand-sub">SolDesign</span></span></Link>
    <span className="topbar-spacer" />
    <button className="topbar-search" onClick={onOpenPalette}>{t('app.search')} <kbd>Ctrl K</kbd></button>
    <button className="topbar-button" onClick={() => setLocale(locale === 'fr' ? 'en' : 'fr')} aria-label={locale === 'fr' ? 'Switch to English' : 'Passer au français'}>{locale.toUpperCase()}</button>
    <button className="topbar-button" onClick={toggleTheme}>{theme === 'light' ? t('app.darkMode') : t('app.lightMode')}</button>
    <button className="button button-primary" onClick={createStudy}>{t('app.newProject')}</button>
  </header>;
}
