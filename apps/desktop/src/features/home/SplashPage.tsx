import { useT } from '../../shared/i18n/index.js';

export function SplashPage() {
  const t = useT();
  return <main className="splash" aria-busy="true"><span className="brand-mark" aria-hidden="true"><span /><span /></span><strong>{t('app.name')}</strong><span role="status">{t('app.loading')}</span></main>;
}
