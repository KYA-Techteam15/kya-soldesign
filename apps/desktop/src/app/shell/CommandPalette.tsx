import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useT } from '../../shared/i18n/index.js';
import { Dialog } from '../../shared/ui/Dialog.js';

const destinations = [
  ['nav.home', '/accueil'], ['nav.projects', '/accueil/projets'], ['nav.catalog', '/catalogue'], ['nav.settings', '/reglages'],
] as const;

export function CommandPalette({ open, onClose }: { readonly open: boolean; readonly onClose: () => void }) {
  const navigate = useNavigate();
  const t = useT();
  const [query, setQuery] = useState('');
  const visible = useMemo(() => destinations.filter(([key]) => t(key).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())), [query, t]);
  return <Dialog open={open} title={t('palette.title')} onClose={onClose}><p>{t('palette.hint')}</p><input data-dialog-initial className="input" aria-label={t('app.search')} value={query} onChange={(event) => setQuery(event.target.value)} /><div className="palette-results">{visible.map(([key, path]) => <button key={path} className="button button-secondary" onClick={() => { void navigate(path); onClose(); }}>{t(key)}</button>)}{visible.length === 0 ? <p role="status">{t('catalog.empty')}</p> : null}</div></Dialog>;
}
