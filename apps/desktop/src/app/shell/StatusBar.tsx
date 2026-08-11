import { useT } from '../../shared/i18n/index.js';
export function StatusBar() { const t = useT(); return <footer className="statusbar"><span className="status-dot" aria-hidden="true"/><span>{t('app.sessionOnly')}</span></footer>; }
