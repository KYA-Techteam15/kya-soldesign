import { useEffect, useMemo, useState } from 'react';
import { asEquipmentRecord, type Equipment, type EquipmentRecordV2 } from '@ksd/catalog';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { fmt } from '../domain/format';
import { fill, useT } from '../i18n';
import { useCatalog } from '../app/CatalogProvider';
import { catalogOptions, emptyCatalogFilters, filterEquipment, type CatalogFilterState } from '../app/models/catalogFilters';
import { EquipmentEditor } from './catalog/EquipmentEditor';
import { useUi } from '../store/ui';
import { useSettings } from '../store/settings';
import type { EquipmentFamily } from '../app/models/applicationSettings';

type Tab = 'modules' | 'batteries' | 'inverters';
type PvModule = Extract<Equipment, { readonly kind: 'pv-module' }>;
type Battery = Extract<Equipment, { readonly kind: 'battery' }>;
type Inverter = Extract<Equipment, { readonly kind: 'inverter' }>;

export function CatalogRoute() {
  const t = useT();
  const ask = useUi((state) => state.ask);
  const notify = useUi((state) => state.notify);
  const sizing = useSettings((state) => state.sizing);
  const updateCategory = useSettings((state) => state.updateCategory);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const { equipment, status, errorCode, retry, summary, createUserEquipment, duplicateUserEquipment, updateUserEquipment, archiveUserEquipment } = useCatalog();
  const [tab, setTab] = useState<Tab>('modules');
  const [q, setQ] = useState('');
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState<{ readonly kind: Equipment['kind']; readonly source?: EquipmentRecordV2 } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
  const family: EquipmentFamily = tab === 'modules' ? 'module' : tab === 'batteries' ? 'battery' : 'inverter';
  const favorites = sizing.favorites[family];
  const cap = sizing.caps[family];
  const filtered = useMemo(() => {
    const rows = filterEquipment(current, q, filters);
    return onlyFavorites ? rows.filter((item) => favorites.includes(item.id)) : rows;
  }, [current, favorites, filters, onlyFavorites, q]);
  /** « Mes références » : l'optimisation les combine ; le plafond borne le nombre de combinaisons. */
  const toggleFavorite = (id: string) => {
    if (favorites.includes(id)) { updateCategory('sizing', { favorites: { ...sizing.favorites, [family]: favorites.filter((item) => item !== id) } }); return; }
    if (cap !== null && favorites.length >= cap) { notify({ kind: 'warning', title: fill(t('catalog.favoritesCapReached'), { cap }), detail: t('catalog.favoritesCapHelp') }); return; }
    updateCategory('sizing', { favorites: { ...sizing.favorites, [family]: [...favorites, id] } });
  };
  const star = (id: string, model: string) => <td className="fav"><button type="button" className={`fav-toggle ${favorites.includes(id) ? 'on' : ''}`} aria-pressed={favorites.includes(id)} aria-label={fill(t('catalog.favoriteToggle'), { model })} onClick={() => toggleFavorite(id)}>{favorites.includes(id) ? '★' : '☆'}</button></td>;
  const options = useMemo(() => catalogOptions(current, q, filters), [current, filters, q]);
  const setFilter = (key: keyof CatalogFilterState, value: string) => { setPage(1); setFilters((before) => ({ ...before, [key]: value })); };
  const resetFilters = () => { setQ(''); setFilters(emptyCatalogFilters); setPage(1); };
  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const primaryLabel = tab === 'batteries' ? t('catalog.primaryCapacity') : t('catalog.primaryPower');
  const activeKind: Equipment['kind'] = tab === 'modules' ? 'pv-module' : tab === 'batteries' ? 'battery' : 'inverter';
  const duplicate = async (item: Equipment) => { setActionError(null); try { await duplicateUserEquipment(item); } catch (error) { setActionError(error instanceof Error ? error.message : 'EQUIPMENT_DUPLICATE_FAILED'); } };
  const archive = (item: EquipmentRecordV2) => ask({ title: t('equipment.actions.archive'), message: `${t('equipment.actions.archiveConfirm')} « ${item.model} » ?`, confirmLabel: t('equipment.actions.archive'), danger: true, onConfirm: () => { setActionError(null); void archiveUserEquipment(item).catch((error: unknown) => setActionError(error instanceof Error ? error.message : 'EQUIPMENT_ARCHIVE_FAILED')); } });
  const activeFilters = ([
    ['manufacturer', filters.manufacturer],
    [tab === 'inverters' ? 'type' : 'technology', tab === 'inverters' ? filters.type : filters.technology],
    ['minPower', filters.minPower], ['maxPower', filters.maxPower], ['minVoltage', filters.minVoltage], ['maxVoltage', filters.maxVoltage],
  ] as const).filter((entry) => entry[1]);
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
                {t('catalog.modules')} ({modules.length})
              </button>
              <button
                aria-selected={tab === 'batteries'}
                onClick={() => { setTab('batteries'); resetFilters(); }}
              >
                {t('catalog.batteries')} ({batteries.length})
              </button>
              <button
                aria-selected={tab === 'inverters'}
                onClick={() => { setTab('inverters'); resetFilters(); }}
              >
                {t('catalog.inverters')} ({inverters.length})
              </button>
            </div>
            <span className="sep" />
            <button className="btn" onClick={() => setEditor({ kind: activeKind })}>+ {t('equipment.actions.add')}</button>
            <input
              className="hdr-search"
              style={{ width: 260 }}
              placeholder={t('catalog.searchPlaceholder')}
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value); }}
            />
          </div>

          {status === 'ready' && <div className="rowline catalog-filters" aria-label={t('catalog2.filtresDynamiques')}>
            <select value={filters.manufacturer} onChange={(e) => setFilter('manufacturer', e.target.value)} aria-label={t('catalog.manufacturer')}><option value="">{t('catalog.filter.manufacturers')}</option>{options.manufacturers.map((value) => <option key={value}>{value}</option>)}</select>
            {tab !== 'inverters' && <select value={filters.technology} onChange={(e) => setFilter('technology', e.target.value)} aria-label={t('catalog.technology')}><option value="">{t('catalog.filter.technologies')}</option>{options.technologies.map((value) => <option key={value}>{value}</option>)}</select>}
            {tab === 'inverters' && <select value={filters.type} onChange={(e) => setFilter('type', e.target.value)} aria-label={t('catalog.type')}><option value="">{t('catalog.filter.types')}</option>{options.types.map((value) => <option key={value}>{value}</option>)}</select>}
            <input inputMode="decimal" placeholder={tab === 'batteries' ? t('catalog.filter.minCapacity') : t('catalog.filter.minPower')} aria-label={`${primaryLabel} min.`} value={filters.minPower} onChange={(e) => setFilter('minPower', e.target.value)} />
            <input inputMode="decimal" placeholder={tab === 'batteries' ? t('catalog.filter.maxCapacity') : t('catalog.filter.maxPower')} aria-label={`${primaryLabel} max.`} value={filters.maxPower} onChange={(e) => setFilter('maxPower', e.target.value)} />
            <input inputMode="decimal" placeholder={t('catalog.filter.minVoltage')} aria-label={t('catalog.filter.minVoltage')} value={filters.minVoltage} onChange={(e) => setFilter('minVoltage', e.target.value)} />
            <input inputMode="decimal" placeholder={t('catalog.filter.maxVoltage')} aria-label={t('catalog.filter.maxVoltage')} value={filters.maxVoltage} onChange={(e) => setFilter('maxVoltage', e.target.value)} />
            <button className="btn" onClick={resetFilters}>{t('catalog.filter.reset')}</button>
            <button type="button" className={`btn fav-filter ${onlyFavorites ? 'on' : ''}`} aria-pressed={onlyFavorites} onClick={() => { setPage(1); setOnlyFavorites((value) => !value); }}>★ {t('catalog.myReferences')} ({favorites.length}{cap === null ? '' : `/${cap}`})</button>
          </div>}

          {status === 'ready' && activeFilters.length > 0 && <div className="catalog-active" aria-label={t('catalog.activeFilters')}><span className="label">{t('catalog.activeFilters')}</span>{activeFilters.map(([key, value]) => <button className="filter-chip" key={key} onClick={() => setFilter(key as keyof CatalogFilterState, '')}>{value} ×<span className="sr-only"> {t('catalog.removeFilter')}</span></button>)}</div>}
          {actionError && <div className="form-errors" role="alert">{actionError}</div>}

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
              <table className="tbl catalog-table">
                <thead>
                  <tr>
                    <th aria-label={t('catalog.myReferences')} title={t('catalog.myReferences')}>★</th>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>{t('catalog.primaryPower')}<span className="unit">Wc</span></th>
                    <th>
                      {t('catalog.vmp')}<span className="unit">V</span>
                    </th>
                    <th>
                      {t('catalog.voc')}<span className="unit">V</span>
                    </th>
                    <th>
                      {t('catalog.imp')}<span className="unit">A</span>
                    </th>
                    <th>
                      {t('catalog.surface')}<span className="unit">m²</span>
                    </th>
                    <th>{t('catalog.provenance')}</th>
                    <th>{t('equipment.actions.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is PvModule => item.kind === 'pv-module')
                    .filter((item) => visible.includes(item))
                    .map((m) => (
                      <tr key={m.id}>
                        {star(m.id, m.model)}
                        <td>{m.model}</td>
                        <td>{m.manufacturer}</td>
                        <td className="num">{fmt(m.nominalPowerW)}</td>
                        <td className="num">{fmt(m.voltageAtMaximumPowerV, 2)}</td>
                        <td className="num">{fmt(m.openCircuitVoltageV, 2)}</td>
                        <td className="num">{fmt(m.currentAtMaximumPowerA, 2)}</td>
                        <td className="num">{m.areaM2 === null ? '—' : fmt(m.areaM2, 2)}</td>
                        <td><details><summary>{t('catalog.source')}</summary><small>{m.provenance.sourceId}</small></details></td>
                        <td><CatalogActions item={m} onDuplicate={() => void duplicate(m)} onEdit={() => setEditor({ kind: m.kind, source: asEquipmentRecord(m) })} onArchive={() => archive(asEquipmentRecord(m))} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'batteries' && (
              <table className="tbl catalog-table">
                <thead>
                  <tr>
                    <th aria-label={t('catalog.myReferences')} title={t('catalog.myReferences')}>★</th>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>{t('catalog.technology')}</th>
                    <th>
                      {t('catalog.primaryCapacity')}<span className="unit">Ah</span>
                    </th>
                    <th>
                      {t('catalog.voltage')}<span className="unit">V</span>
                    </th>
                    <th>
                      {t('catalog.dod')}<span className="unit">%</span>
                    </th>
                    <th>
                      {t('catalog.efficiency')}<span className="unit">%</span>
                    </th>
                    <th>{t('catalog.provenance')}</th>
                    <th>{t('equipment.actions.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is Battery => item.kind === 'battery')
                    .filter((item) => visible.includes(item))
                    .map((b) => (
                      <tr key={b.id}>
                        {star(b.id, b.model)}
                        <td>{b.model}</td>
                        <td>{b.manufacturer}</td>
                        <td className="txt">{b.technology ?? '—'}</td>
                        <td className="num">{fmt(b.nominalCapacityAh)}</td>
                        <td className="num">{fmt(b.nominalVoltageV)}</td>
                        <td className="num">{b.usableDepthOfDischargeRatio === null ? '—' : fmt(b.usableDepthOfDischargeRatio * 100)}</td>
                        <td className="num">{b.roundTripEfficiencyRatio === null ? '—' : fmt(b.roundTripEfficiencyRatio * 100)}</td>
                        <td><details><summary>{t('catalog.source')}</summary><small>{b.provenance.sourceId}</small></details></td>
                        <td><CatalogActions item={b} onDuplicate={() => void duplicate(b)} onEdit={() => setEditor({ kind: b.kind, source: asEquipmentRecord(b) })} onArchive={() => archive(asEquipmentRecord(b))} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}

            {status === 'ready' && tab === 'inverters' && (
              <table className="tbl catalog-table">
                <thead>
                  <tr>
                    <th aria-label={t('catalog.myReferences')} title={t('catalog.myReferences')}>★</th>
                    <th>{t('catalog.reference')}</th>
                    <th>{t('catalog.manufacturer')}</th>
                    <th>{t('catalog.type')}</th>
                    <th>
                      {t('catalog.power')}<span className="unit">W</span>
                    </th>
                    <th>
                      {t('catalog.vdc')}<span className="unit">V</span>
                    </th>
                    <th>
                      {t('catalog.efficiency')}<span className="unit">%</span>
                    </th>
                    <th>
                      {t('catalog.pvMax')}<span className="unit">W</span>
                    </th>
                    <th>{t('catalog.provenance')}</th>
                    <th>{t('equipment.actions.title')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter((item): item is Inverter => item.kind === 'inverter')
                    .filter((item) => visible.includes(item))
                    .map((i) => (
                      <tr key={i.id}>
                        {star(i.id, i.model)}
                        <td>{i.model}</td>
                        <td>{i.manufacturer}</td>
                        <td className="txt">{i.inverterType ?? '—'}</td>
                        <td className="num">{fmt(i.nominalAcPowerW)}</td>
                        <td className="num">{fmt(i.nominalDcVoltageV)}</td>
                        <td className="num">{i.efficiencyRatio === null ? '—' : fmt(i.efficiencyRatio * 100)}</td>
                        <td className="num">{i.pvArrayMaxPowerW === null ? '—' : fmt(i.pvArrayMaxPowerW)}</td>
                        <td><details><summary>{t('catalog.source')}</summary><small>{i.provenance.sourceId}</small></details></td>
                        <td><CatalogActions item={i} onDuplicate={() => void duplicate(i)} onEdit={() => setEditor({ kind: i.kind, source: asEquipmentRecord(i) })} onArchive={() => archive(asEquipmentRecord(i))} /></td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
          {status === 'ready' && filtered.length === 0 && <div className="empty" role="status"><b>{t('catalog.noResults')}</b><button className="btn" onClick={resetFilters}>{t('catalog.filter.reset')}</button></div>}
          {status === 'ready' && filtered.length > 0 && <div className="rowline catalog-pagination"><span className="label">{t('catalog.page')} {page} / {pageCount}</span><button className="btn" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label={t('catalog.previous')}>←</button><button className="btn" disabled={page === pageCount} onClick={() => setPage((value) => value + 1)} aria-label={t('catalog.next')}>→</button></div>}
          <p className="label">
            {filtered.length} {t('catalog.results')} — {t('catalog.validatedData')}
            {summary && ` · ${fill(t('catalog.qualityWarnings'), { count: summary.warnings })}`}
          </p>
          {editor && <EquipmentEditor kind={editor.kind} source={editor.source} onClose={() => setEditor(null)} onSave={async (draft) => { if (editor.source) await updateUserEquipment(editor.source, draft); else await createUserEquipment(draft); }} />}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}

function CatalogActions({ item, onDuplicate, onEdit, onArchive }: { readonly item: Equipment; readonly onDuplicate: () => void; readonly onEdit: () => void; readonly onArchive: () => void }) {
  const t = useT();
  const userOwned = item.origin === 'user';
  return <div className="catalog-actions"><button type="button" className="btn btn-ghost" onClick={onDuplicate}>{t('equipment.actions.duplicate')}</button>{userOwned && <><button type="button" className="btn btn-ghost" onClick={onEdit}>{t('equipment.actions.edit')}</button><button type="button" className="btn btn-ghost" onClick={onArchive}>{t('equipment.actions.archive')}</button></>}</div>;
}
