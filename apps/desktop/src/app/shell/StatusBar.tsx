import { useApplication } from '../ApplicationProvider.js';
import { useT } from '../../shared/i18n/index.js';

export function StatusBar() {
  const t = useT();
  const { locale } = useApplication();
  return <footer className="statusbar"><span className="live">{t('app.sessionOnly')}</span><span className="sep" /><span>{locale === 'fr' ? 'Français' : 'English'}</span></footer>;
}
