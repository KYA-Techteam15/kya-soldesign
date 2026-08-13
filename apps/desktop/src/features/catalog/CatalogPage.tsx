import { useEffect, useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { useApplication } from '../../app/ApplicationProvider.js';
import { StatusBar } from '../../app/shell/StatusBar.js';
import { TopBar } from '../../app/shell/TopBar.js';
import { useT } from '../../shared/i18n/index.js';
import { useValidatedCopy } from '../../shared/i18n/useValidatedCopy.js';

type CatalogTab = Equipment['kind'];
const catalogTabs: readonly CatalogTab[] = ['pv-module', 'battery', 'inverter'];
const number = (value: number | null, digits = 0) => value === null ? '—' : new Intl.NumberFormat('fr-FR', { maximumFractionDigits: digits }).format(value);

export function CatalogPage() {
  const t = useT();
  const { services } = useApplication();
  const [items, setItems] = useState<readonly Equipment[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<CatalogTab>('pv-module');
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void services.catalog.list({ kind: tab }).then((result) => { if (active) { setItems(result); setFailed(false); setLoading(false); } }).catch(() => { if (active) { setFailed(true); setLoading(false); } });
    return () => { active = false; };
  }, [services, tab, revision]);
  const visible = useMemo(() => items.filter((item) => !query.trim() || `${item.manufacturer} ${item.model}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).slice(0, 60), [items, query]);

  return <div className="page">
    <TopBar back="/accueil" />
    <main className="page-body"><div className="page-inner">
      <div className="rowline"><h1 className="page-title">{t('catalog.title')}</h1><div className="seg" role="tablist" aria-label={t('catalog.title')}>{catalogTabs.map((kind) => <button key={kind} role="tab" aria-selected={tab === kind} onClick={() => setTab(kind)}>{t(`catalog.kind.${kind}`)}</button>)}</div><span className="sep" /><input className="hdr-search" style={{ width: 260 }} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('catalog.search')} aria-label={t('catalog.search')} /></div>
      {loading ? <div className="empty" role="status"><b>{t('state.loading')}</b></div> : failed ? <div className="empty" role="alert"><b>{t('catalog.error')}</b>{t('error.retryHelp')}<button className="btn" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></div> : visible.length ? <div className="tbl-wrap catalog-card"><EquipmentTable kind={tab} items={visible} /></div> : <div className="empty"><b>{t('catalog.empty')}</b></div>}
      <p className="label">{t('catalog.provenance')} · {visible.length} lignes affichées</p>
    </div></main>
    <StatusBar />
  </div>;
}

function EquipmentTable({ kind, items }: { readonly kind: CatalogTab; readonly items: readonly Equipment[] }) {
  const v = useValidatedCopy();
  if (kind === 'pv-module') return <table className="tbl"><thead><tr><th>{v('reference')}</th><th>{v('manufacturer')}</th><th>{v('power')}<span className="unit">{'Wc'}</span></th><th>{'Vmp'}<span className="unit">{'V'}</span></th><th>{'Voc'}<span className="unit">{'V'}</span></th><th>{'Imp'}<span className="unit">{'A'}</span></th><th>{v('surface')}<span className="unit">{'m²'}</span></th></tr></thead><tbody>{items.filter((item): item is Extract<Equipment, { kind: 'pv-module' }> => item.kind === 'pv-module').map((item) => <tr key={item.id}><td>{item.model}</td><td>{item.manufacturer}</td><td className="num">{number(item.nominalPowerW)}</td><td className="num">{number(item.voltageAtMaximumPowerV, 2)}</td><td className="num">{number(item.openCircuitVoltageV, 2)}</td><td className="num">{number(item.currentAtMaximumPowerA, 2)}</td><td className="num">{number(item.areaM2, 2)}</td></tr>)}</tbody></table>;
  if (kind === 'battery') return <table className="tbl"><thead><tr><th>{v('reference')}</th><th>{v('manufacturer')}</th><th>{v('technology')}</th><th>{v('capacity')}<span className="unit">{'Ah'}</span></th><th>{v('voltage')}<span className="unit">{'V'}</span></th><th>{'DoD'}<span className="unit">{'%'}</span></th><th>{v('efficiency')}<span className="unit">{'%'}</span></th></tr></thead><tbody>{items.filter((item): item is Extract<Equipment, { kind: 'battery' }> => item.kind === 'battery').map((item) => <tr key={item.id}><td>{item.model}</td><td>{item.manufacturer}</td><td>{item.technology ?? '—'}</td><td className="num">{number(item.nominalCapacityAh, 1)}</td><td className="num">{number(item.nominalVoltageV, 1)}</td><td className="num">{number(item.usableDepthOfDischargeRatio === null ? null : item.usableDepthOfDischargeRatio * 100)}</td><td className="num">{number(item.roundTripEfficiencyRatio === null ? null : item.roundTripEfficiencyRatio * 100)}</td></tr>)}</tbody></table>;
  return <table className="tbl"><thead><tr><th>{v('reference')}</th><th>{v('manufacturer')}</th><th>{v('type')}</th><th>{v('power')}<span className="unit">{'W'}</span></th><th>{'Vdc'}<span className="unit">{'V'}</span></th><th>{v('efficiency')}<span className="unit">{'%'}</span></th><th>{v('pvMax')}<span className="unit">{'W'}</span></th></tr></thead><tbody>{items.filter((item): item is Extract<Equipment, { kind: 'inverter' }> => item.kind === 'inverter').map((item) => <tr key={item.id}><td>{item.model}</td><td>{item.manufacturer}</td><td>{item.inverterType ?? '—'}</td><td className="num">{number(item.nominalAcPowerW)}</td><td className="num">{number(item.nominalDcVoltageV)}</td><td className="num">{number(item.efficiencyRatio === null ? null : item.efficiencyRatio * 100, 1)}</td><td className="num">{number(item.pvArrayMaxPowerW)}</td></tr>)}</tbody></table>;
}
