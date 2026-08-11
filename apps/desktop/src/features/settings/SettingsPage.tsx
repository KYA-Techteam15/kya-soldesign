import { useApplication } from '../../app/ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';

export function SettingsPage() {
 const t = useT(); const { locale, setLocale, theme, toggleTheme } = useApplication();
 return <main className="main-content"><header className="page-head"><h1>{t('settings.title')}</h1><p>{t('settings.desktopLater')}</p></header><section className="settings-card"><h2>{t('settings.language')}</h2><div className="button-group"><button className={locale === 'fr' ? 'button button-primary' : 'button button-secondary'} onClick={() => setLocale('fr')}>Français</button><button className={locale === 'en' ? 'button button-primary' : 'button button-secondary'} onClick={() => setLocale('en')}>English</button></div></section><section className="settings-card"><h2>{t('settings.theme')}</h2><button className="button button-secondary" onClick={toggleTheme}>{theme === 'light' ? t('settings.dark') : t('settings.light')}</button></section></main>;
}
