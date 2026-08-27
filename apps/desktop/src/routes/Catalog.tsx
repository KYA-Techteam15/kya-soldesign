import { useEffect, useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { fmt } from '../domain/format';
import { useT } from '../i18n';
import { useCatalog } from '../app/CatalogProvider';
import { catalogOptions, emptyCatalogFilters, filterEquipment, type CatalogFilterState } from '../app/models/catalogFilters';

type Tab = 'modules' | 'batteries' | 'inverters';
type PvModule = Extract<Equipment, { readonly kind: 'pv-module' }>;
type Battery = Extract<Equipment, { readonly kind: 'battery' }>;
type Inverter = Extract<Equipment, { readonly kind: 'inverter' }>;

export function CatalogRoute() {
  const t = useT();
  const { equipment, status, errorCode, retry, summary } = useCatalog();
  const [tab, setTab] = useState<Tab>('modules');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const [page, setPage] = useState(1);
  const pageSize = 60;
  const modules = useMemo(
    () => equipment.filter((item): item is PvModule => item.kind === 'pv-module'),
    [equipment],
  );
  const batteries = useMemo(
    () => equipment.filter((item): item is Battery => item.kind === 'battery'),
    [equipment],
  );
  const inverters = useMemo(
    () => equipment.filter((item): item is Inverter => item.kind === 'inverter'),
    [equipment],
  );
  const current = tab === 'modules' ? modules : tab === 'batteries' ? batteries : inverters;
  const filtered = useMemo(() => filterEquipment(current, q, filters), [current, filters, q]);
  const options = useMemo(() => catalogOptions(current, q, filters), [current, filters, q]);
  const setFilter = (key: keyof CatalogFilterState, value: string) => { setPage(1); setFilters((before) => ({ ...before, [key]: value })); };
  const resetFilters = () => { setQ(''); setFilters(emptyCatalogFilters); setPage(1); };
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setPage((value) => Math.min(value, pageCount)); }, [pageCount]);

  return (
    <div className="page">
      <TopBar back="/accueil" />
      <div className="page-body">
        <div className="page-inner">
          <div className="rowline">
            <h1 className="page-title">{t('home.catalog')}</h1>
            <div className="seg">
              <button aria-selected={tab === 'modules'} onClick={() => { setTab('modules'); resetFilters(); }}>
                Modules ({modules.length})
              </button>
              <button
                aria-selected={tab === 'batteries'}
                onClick={() => { setTab('batteries'); resetFilters(); }}
              >
                Batteries ({batteries.length})
              </button>
              <button
                aria-selected={tab === 'inverters'}
                onClick={() => { setTab('inverters'); resetFilters(); }}
              >
                Onduleurs ({inverters.length})
              </button>
            </div>
            <span className="sep" />
            <input
              className="hdr-search"
              style={{ width: 260 }}
              placeholder="Filtrer par code ou fabricant…"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>

          {status === 'ready' && <div className="rowline catalog-filters" aria-label="Filtres dynamiques">
            <select value={filters.manufacturer} onChange={(e) => setFilter('manufacturer', e.target.value)} aria-label={t('catalog.manufacturer')}><option value="">{t('catalog.filter.manufacturers')}</option>{options.manufacturers.map((value) => <option key={value}>{value}</option>)}</select>
            {tab !== 'inverters' && <select value={filters.technology} onChange={(e) => setFilter('technology', e.target.value)} aria-label={t('catalog.technology')}><option value="">{t('catalog.filter.technologies')}</option>{options.technologies.map((value) => <option key={value}>{value}</option>)}</select>}
            {tab === 'inverters' && <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} aria-label={t('catalog.type')}><option value="">{t('catalog.filter.types')}</option>{options.types.map((value) => <option key={value}>{value}</option>)}</select>}
            <input inputMode="decimal" placeholder={t('catalog.filter.minPower')} aria-label={t('catalog.filter.minPower')} value={filters.minPower} onChange={(e) => setFilter('minPower', e.target.value)} />
            <input inputMode="decimal" placeholder={t('catalog.filter.maxPower')} aria-label={t('catalog.filter.maxPower')} value={filters.maxPower} onChange={(e) => setFilter('maxPower', e.target.value)} />
            <input inputMode="decimal" placeholder={t('catalog.filter.minVoltage')} aria-label={t('catalog.filter.minVoltage')} value={filters.minVoltage} onChange={(e) => setFilter('minVoltage', e.target.value)} />
            <input inputMode="decimal" placeholder={t('catalog.filter.maxVoltage')} aria-label={t('catalog.filter.maxVoltage')} value={filters.maxVoltage} onChange={(e) => setFilter('maxVoltage', e.target.value)} />
            <button className="btn" onClick={resetFilters}>{t('catalog.filter.reset')}</button>
          </div>}

          <div className="tbl-wrap">
            {status === 'loading' && (
              <div className="empty" role="status"><b>{t('catalog.loading')}</b></div>
            )}
            {status === 'error' && (
              <div className="empty" role="alert">
                <b>{t('catalog.unavailable')}</b>
                <span>{errorCode}</span>
                <button className="btn" onClick={retry}>{t('catalog.retry')}</button>
              </div>
            )}
            {status === 'ready' && tab === 'modules' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>
                      Puissance<span className="unit">Wc</span>
                    </th>
                    <th>
                      Vmp<span className="unit">V</span>
                    </th>
                    <th>
                      Voc<span className="unit">V</span>
                    </th>
                    <th>
                      Imp<span className="unit">A</span>
                    </th>
                    <th>
                      Surface<span className="unit">m²</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is PvModule => item.kind === 'pv-module')
                    .filter((item) => visible.includes(item))
                    .map((m) => (
                      <tr key={m.id} title={`Source : ${m.provenance.sourceId}`}>
                        <td>{m.model}</td>
                        <td>{m.manufacturer}</td>
                        <td className="num">{fmt(m.nominalPowerW)}</td>
                        <td className="num">{fmt(m.voltageAtMaximumPowerV, 2)}</td>
                        <td className="num">{fmt(m.openCircuitVoltageV, 2)}</td>
                        <td className="num">{fmt(m.currentAtMaximumPowerA, 2)}</td>
                        <td className="num">{m.areaM2 === null ? '—' : fmt(m.areaM2, 2)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'batteries' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>{t('catalog.technology')}</th>
                    <th>
                      Capacité<span className="unit">Ah</span>
                    </th>
                    <th>
                      Tension<span className="unit">V</span>
                    </th>
                    <th>
                      DoD<span className="unit">%</span>
                    </th>
                    <th>
                      Rendement<span className="unit">%</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is Battery => item.kind === 'battery')
                    .filter((item) => visible.includes(item))
                    .map((b) => (
                      <tr key={b.id} title={`Source : ${b.provenance.sourceId}`}>
                        <td>{b.model}</td>
                        <td>{b.manufacturer}</td>
                        <td>{b.technology ?? '—'}</td>
                        <td className="num">{fmt(b.nominalCapacityAh)}</td>
                        <td className="num">{fmt(b.nominalVoltageV)}</td>
                        <td className="num">{b.usableDepthOfDischargeRatio === null ? '—' : fmt(b.usableDepthOfDischargeRatio * 100)}</td>
                        <td className="num">{b.roundTripEfficiencyRatio === null ? '—' : fmt(b.roundTripEfficiencyRatio * 100)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'inverters' && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>{t('catalog.type')}</th>
                    <th>
                      Puissance<span className="unit">W</span>
                    </th>
                    <th>
                      Vdc<span className="unit">V</span>
                    </th>
                    <th>
                      Rendement<span className="unit">%</span>
                    </th>
                    <th>
                      PV max<span className="unit">W</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is Inverter => item.kind === 'inverter')
                    .filter((item) => visible.includes(item))
                    .map((i) => (
                      <tr key={i.id} title={`Source : ${i.provenance.sourceId}`}>
                        <td>{i.model}</td>
                        <td>{i.manufacturer}</td>
                        <td>{i.inverterType ?? '—'}</td>
                        <td className="num">{fmt(i.nominalAcPowerW)}</td>
                        <td className="num">{fmt(i.nominalDcVoltageV)}</td>
                        <td className="num">{i.efficiencyRatio === null ? '—' : fmt(i.efficiencyRatio * 100)}</td>
                        <td className="num">{i.pvArrayMaxPowerW === null ? '—' : fmt(i.pvArrayMaxPowerW)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          {status === 'ready' && filtered.length === 0 && <div className="empty" role="status"><b>{t('catalog.noResults')}</b><button className="btn" onClick={resetFilters}>{t('catalog.filter.reset')}</button></div>}
          {status === 'ready' && filtered.length > 0 && <div className="rowline catalog-pagination"><span className="label">Page {page} / {pageCount}</span><button className="btn" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>←</button><button className="btn" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)}>→</button></div>}
          <p className="label">
            {filtered.length} résultat(s) — données canoniques validées
            {summary && ` · ${summary.warnings} avertissement(s) qualité`}
          </p>
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
