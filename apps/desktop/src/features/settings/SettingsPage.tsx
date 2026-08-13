import { useApplication } from '../../app/ApplicationProvider.js';
import { StatusBar } from '../../app/shell/StatusBar.js';
import { TopBar } from '../../app/shell/TopBar.js';
import { useT } from '../../shared/i18n/index.js';
import { useValidatedCopy } from '../../shared/i18n/useValidatedCopy.js';

export function SettingsPage() {
  const t = useT();
  const v = useValidatedCopy();
  const { locale, setLocale, theme, toggleTheme } = useApplication();
  return <div className="page">
    <TopBar back="/accueil" />
    <main className="page-body"><div className="page-inner">
      <h1 className="page-title">{t('settings.title')}</h1>
      <div className="kpis">
        <div className="kpi kpi-head"><span className="h-sec">{v('interface')}</span></div>
        <div className="kpi"><span>{t('settings.theme')}</span><span className="seg"><button aria-pressed={theme === 'light'} onClick={theme === 'dark' ? toggleTheme : undefined}>{t('settings.light')}</button><button aria-pressed={theme === 'dark'} onClick={theme === 'light' ? toggleTheme : undefined}>{t('settings.dark')}</button></span></div>
        <div className="kpi"><span>{t('settings.language')}</span><span className="seg"><button aria-pressed={locale === 'fr'} onClick={() => setLocale('fr')}>Français</button><button aria-pressed={locale === 'en'} onClick={() => setLocale('en')}>English</button></span></div>
      </div>
      <div className="stub"><b>{t('app.sessionOnly')}</b><p>{t('settings.desktopLater')}</p><span className="tag">{'DESK-001'}</span></div>
    </div></main>
    <StatusBar />
  </div>;
}
