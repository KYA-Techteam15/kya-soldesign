import { Link } from 'react-router-dom';
import { useT } from '../../shared/i18n/index.js';

export function NotFoundPage() {
  const t = useT();
  return <main className="main-content"><section className="state-panel not-found" role="status"><h1>{t('route.notFound')}</h1><p>{t('route.notFoundBody')}</p><Link className="button button-secondary inline-action" to="/accueil">{t('nav.home')}</Link></section></main>;
}
