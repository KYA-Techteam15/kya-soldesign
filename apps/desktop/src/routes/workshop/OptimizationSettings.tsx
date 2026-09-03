import { useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import type { OptimizationRequest, SelectionScope } from '@ksd/engine';
import { Dialog } from '../../ui/Dialog';
import { NumField } from '../../ui/Field';
import { catalogOptions, emptyCatalogFilters, filterEquipment, type CatalogFilterState } from '../../app/models/catalogFilters';
import { useT } from '../../i18n';

type Family = 'module' | 'battery' | 'inverter';
type ScopeMode = SelectionScope['mode'];
type Objective = OptimizationRequest['objective'];

const CANONICAL_KIND: Readonly<Record<Family, Equipment['kind']>> = { module: 'pv-module', battery: 'battery', inverter: 'inverter' };

export function OptimizationSettings({ equipment, initial, onClose, onRun }: {
  readonly equipment: readonly Equipment[];
  readonly initial: OptimizationRequest;
  readonly onClose: () => void;
  readonly onRun: (request: OptimizationRequest) => void;
}) {
  const t = useT();
  const [request, setRequest] = useState<OptimizationRequest>(initial);
  const setScope = (family: Family, scope: SelectionScope) => setRequest((before) => ({ ...before, [family]: scope }));
  const setObjective = (objective: Objective) => setRequest((before) => ({ ...before, objective }));
  const setMaxOversize = (family: Family, value: string) => setRequest((before) => ({ ...before, maxOversizeRatio: { ...before.maxOversizeRatio, [family]: value.trim() === '' ? undefined : Number.parseFloat(value.replace(',', '.')) / 100 } }));

  return (
    <Dialog
      title={t('optimization.settingsTitle')}
      lead={t('optimization.settingsLead')}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="label">{t('optimization.disabledUntilRun')}</span>
          <button className="btn btn-ghost" onClick={onClose}>{t('g.cancel')}</button>
          <button className="btn btn-ok" onClick={() => onRun({ ...request, enabled: true })}>{t('optimization.run')}</button>
        </>
      }
    >
      <div className="opt-scopes">
        <ScopeEditor family="module" label={t('optimization.familyModule')} equipment={equipment} scope={request.module} onChange={(scope) => setScope('module', scope)} />
        <ScopeEditor family="battery" label={t('optimization.familyBattery')} equipment={equipment} scope={request.battery} onChange={(scope) => setScope('battery', scope)} />
        <ScopeEditor family="inverter" label={t('optimization.familyInverter')} equipment={equipment} scope={request.inverter} onChange={(scope) => setScope('inverter', scope)} />
      </div>
      <section className="opt-objective">
        <h3>{t('optimization.objectiveTitle')}</h3>
        <div className="seg" role="radiogroup" aria-label={t('optimization.objectiveTitle')}>
          <button type="button" aria-pressed={request.objective === 'closest'} onClick={() => setObjective('closest')}>{t('optimization.objectiveClosest')}</button>
          <button type="button" aria-pressed={request.objective === 'lowest-main-equipment-cost'} onClick={() => setObjective('lowest-main-equipment-cost')}>{t('optimization.objectiveCost')}</button>
          <button type="button" aria-pressed={request.objective === 'fewest-components'} onClick={() => setObjective('fewest-components')}>{t('optimization.objectiveFewest')}</button>
        </div>
        <p className="label">{request.objective === 'closest' ? t('optimization.objectiveClosestHint') : request.objective === 'lowest-main-equipment-cost' ? t('optimization.objectiveCostHint') : t('optimization.objectiveFewestHint')}</p>
      </section>
      <section className="opt-limits">
        <h3>{t('optimization.limitsTitle')}</h3>
        <div className="form-rows opt-limit-fields">
          <NumField label={t('optimization.limitPv')} unit="%" value={(request.maxOversizeRatio?.pv ?? 0) * 100} onChange={(value) => setMaxOversize('module', String(value))} decimals={0} />
          <NumField label={t('optimization.limitStorage')} unit="%" value={(request.maxOversizeRatio?.storage ?? 0) * 100} onChange={(value) => setMaxOversize('battery', String(value))} decimals={0} />
          <NumField label={t('optimization.limitInverter')} unit="%" value={(request.maxOversizeRatio?.inverter ?? 0) * 100} onChange={(value) => setMaxOversize('inverter', String(value))} decimals={0} />
        </div>
        <p className="label">{t('optimization.limitsHint')}</p>
      </section>
    </Dialog>
  );
}

function ScopeEditor({ family, label, equipment, scope, onChange }: {
  readonly family: Family;
  readonly label: string;
  readonly equipment: readonly Equipment[];
  readonly scope: SelectionScope;
  readonly onChange: (scope: SelectionScope) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const familyEquipment = useMemo(() => equipment.filter((item) => item.kind === CANONICAL_KIND[family]), [equipment, family]);
  const options = useMemo(() => catalogOptions(familyEquipment, query, filters), [familyEquipment, filters, query]);
  const rows = useMemo(() => filterEquipment(familyEquipment, query, filters), [familyEquipment, filters, query]);
  const setFilter = (key: keyof CatalogFilterState, value: string) => setFilters((before) => ({ ...before, [key]: value }));
  const setMode = (mode: ScopeMode) => {
    if (mode === 'free') onChange({ mode: 'free' });
    else if (mode === 'fixed') onChange({ mode: 'fixed', equipmentId: familyEquipment[0]?.id ?? '' });
    else onChange({ mode: 'shortlist', equipmentIds: [] });
  };
  const toggleShortlist = (id: string) => {
    if (scope.mode !== 'shortlist') return;
    const set = new Set(scope.equipmentIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange({ mode: 'shortlist', equipmentIds: [...set] });
  };

  return (
    <section className="opt-scope">
      <header>
        <h3>{label}</h3>
        <div className="seg" role="radiogroup" aria-label={`${label} . ${t('optimization.scopeTitle')}`}>
          <button type="button" aria-pressed={scope.mode === 'fixed'} onClick={() => setMode('fixed')}>{t('optimization.scopeFixed')}</button>
          <button type="button" aria-pressed={scope.mode === 'shortlist'} onClick={() => setMode('shortlist')}>{t('optimization.scopeShortlist')}</button>
          <button type="button" aria-pressed={scope.mode === 'free'} onClick={() => setMode('free')}>{t('optimization.scopeFree')}</button>
        </div>
      </header>
      {scope.mode === 'free' && <p className="label">{t('optimization.scopeFreeHint')}</p>}
      {scope.mode === 'fixed' && (
        <select className="cell-in" value={scope.equipmentId} onChange={(event) => onChange({ mode: 'fixed', equipmentId: event.target.value })} aria-label={`${label} . ${t('optimization.scopeFixed')}`}>
          {familyEquipment.map((item) => <option key={item.id} value={item.id}>{item.model} . {item.manufacturer}</option>)}
        </select>
      )}
      {scope.mode === 'shortlist' && (
        <>
          <div className="catalog-filters picker-filters">
            <input placeholder={t('catalog.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
            <select value={filters.manufacturer} onChange={(event) => setFilter('manufacturer', event.target.value)} aria-label={t('catalog.manufacturer')}><option value="">{t('catalog.filter.manufacturers')}</option>{options.manufacturers.map((value) => <option key={value}>{value}</option>)}</select>
          </div>
          <div className="opt-shortlist">
            {rows.length === 0 && <span className="label">{t('equipment.noneFound')}</span>}
            {rows.map((item) => {
              const checked = scope.equipmentIds.includes(item.id);
              return (
                <label key={item.id} className="opt-shortlist-row">
                  <input type="checkbox" checked={checked} onChange={() => toggleShortlist(item.id)} />
                  <span>{item.model} . {item.manufacturer}</span>
                </label>
              );
            })}
          </div>
          <p className="label">{t('optimization.scopeShortlistCount').replace('{n}', String(scope.equipmentIds.length))}</p>
        </>
      )}
    </section>
  );
}