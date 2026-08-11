import { useEffect, useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { useApplication } from '../../app/ApplicationProvider.js';
import { useT, type MessageKey } from '../../shared/i18n/index.js';
import { ErrorState } from '../../shared/status/ErrorState.js';
import { Provenance } from '../../shared/status/Provenance.js';

export function CatalogPage() {
  const t = useT(); const { services } = useApplication(); const [items, setItems] = useState<readonly Equipment[]>([]); const [query, setQuery] = useState(''); const [kind, setKind] = useState<Equipment['kind'] | ''>(''); const [failed, setFailed] = useState(false); const [loading, setLoading] = useState(true); const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; const catalogQuery = { ...(query ? { text: query } : {}), ...(kind ? { kind } : {}) }; setLoading(true); void services.catalog.list(catalogQuery).then((result) => { if (active) { setItems(result); setFailed(false); setLoading(false); } }).catch(() => { if (active) { setFailed(true); setLoading(false); } }); return () => { active = false; }; }, [services, query, kind, revision]);
  const kindLabel = (value: Equipment['kind']) => t(`catalog.kind.${value}` as MessageKey);
  const types = useMemo(() => ['pv-module', 'battery', 'inverter'] as const, []);
  return <main className="main-content"><header className="page-head"><h1>{t('catalog.title')}</h1><p>{t('catalog.provenance')}</p></header><div className="filter-row"><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('catalog.search')} aria-label={t('catalog.search')} /><select className="select" value={kind} onChange={(event) => setKind(event.target.value as Equipment['kind'] | '')} aria-label={t('catalog.allKinds')}><option value="">{t('catalog.allKinds')}</option>{types.map((type) => <option key={type} value={type}>{kindLabel(type)}</option>)}</select></div>{loading ? <section className="state-panel" role="status"><h2>{t('state.loading')}</h2></section> : failed ? <ErrorState title={t('catalog.error')}><p>{t('error.retryHelp')}</p><button className="button button-secondary" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></ErrorState> : items.length ? <div className="catalog-grid">{items.map((item) => <article className="catalog-card" key={item.id}><span className="chip">{kindLabel(item.kind)}</span><h2>{item.manufacturer}</h2><p>{item.model}</p><Provenance sourceId={item.provenance.sourceId} /></article>)}</div> : <section className="state-panel"><h2>{t('catalog.empty')}</h2></section>}</main>;
}
