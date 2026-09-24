/**
 * Canonical equipment selection in the validated dialog geometry.
 * Compatibility, quantities and reserve belong to EQP-001 and are therefore
 * intentionally unavailable until immutable calculation evidence exists.
 */
import { useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { useCatalog } from '../../app/CatalogProvider';
import { fmt } from '../../domain/format';
import { Dialog } from '../../ui/Dialog';
import type { ProjectViewModel } from '../../app/models/projectView';
import { catalogOptions, emptyCatalogFilters, filterEquipment, type CatalogFilterState } from '../../app/models/catalogFilters';
import { fill, tr, useT } from '../../i18n';
import { useSettings } from '../../store/settings';

export type Kind = 'module' | 'battery' | 'inverter';

const TITLE: Record<Kind, string> = {
  module: 'picker.choisirUnModule',
  battery: 'picker.choisirUneBatterie',
  inverter: 'picker.choisirUnOnduleur',
};

const canonicalKind: Readonly<Record<Kind, Equipment['kind']>> = {
  module: 'pv-module',
  battery: 'battery',
  inverter: 'inverter',
};

interface EquipmentDetails {
  readonly technology: string;
  readonly specs: string;
  readonly characteristics: readonly { readonly label: string; readonly value: string }[];
}

function details(item: Equipment): EquipmentDetails {
  if (item.kind === 'pv-module') {
    return {
      technology: item.technology ?? tr('picker.technologieNonRenseignee'),
      specs: `${fmt(item.nominalPowerW)} Wc · ${fmt(item.openCircuitVoltageV, 1)} V`,
      characteristics: [
        { label: 'Vmp', value: `${fmt(item.voltageAtMaximumPowerV, 1)} V` },
        { label: 'Imp', value: `${fmt(item.currentAtMaximumPowerA, 2)} A` },
        { label: 'Isc', value: `${fmt(item.shortCircuitCurrentA, 2)} A` },
        { label: tr('picker.coeffPmax'), value: `${fmt(item.temperatureCoefficientPmaxPerC ?? 0, 3)} /°C` },
        { label: tr('picker.coeffVoc'), value: `${fmt(item.temperatureCoefficientVocPerC ?? 0, 3)} /°C` },
        { label: 'NOCT', value: `${fmt(item.nominalOperatingCellTemperatureC ?? 0, 1)} °C` },
        { label: 'Surface', value: `${fmt(item.areaM2 ?? 0, 2)} m²` },
      ],
    };
  }
  if (item.kind === 'battery') {
    return {
      technology: item.technology ?? tr('picker.technologieNonRenseignee'),
      specs: `${fmt(item.nominalCapacityAh ?? 0)} Ah · ${fmt(item.nominalVoltageV ?? 0)} V`,
      characteristics: [
        { label: tr('equipment.fact.energy'), value: `${fmt(item.nominalEnergyWh / 1000, 2)} kWh` },
        { label: tr('picker.dodUtile'), value: `${fmt((item.usableDepthOfDischargeRatio ?? 0) * 100, 0)} %` },
        { label: 'Rendement', value: `${fmt((item.roundTripEfficiencyRatio ?? 0) * 100, 0)} %` },
        { label: tr('equipmentEditor.dureeDeVie'), value: `${fmt(item.cycleLife ?? 0, 0)} cycles` },
      ],
    };
  }
  return {
    technology: item.inverterType ?? tr('picker.typeNonRenseigne'),
    specs: `${fmt(item.nominalAcPowerW / 1000, 1)} kW · ${fmt(item.nominalDcVoltageV)} Vdc`,
    characteristics: [
      { label: 'Surcharge', value: `${fmt((item.surgePowerW ?? 0) / 1000, 1)} kW` },
      { label: 'Sortie', value: `${fmt(item.nominalAcVoltageV ?? 0, 0)} Vac` },
      { label: 'Rendement', value: `${fmt((item.efficiencyRatio ?? 0) * 100, 1)} %` },
      { label: tr('picker.champPvMax'), value: `${fmt((item.pvArrayMaxPowerW ?? 0) / 1000, 1)} kWc` },
      { label: tr('picker.plageMppt'), value: `${fmt(item.mpptMinVoltageV ?? 0, 0)}–${fmt(item.mpptMaxVoltageV ?? 0, 0)} V` },
      { label: tr('picker.vocPvMax'), value: `${fmt(item.pvOpenCircuitMaxVoltageV ?? 0, 0)} V` },
      { label: tr('picker.entreesPv'), value: fmt(item.pvInputsNumber ?? 0, 0) },
      { label: tr('picker.courantDeCharge'), value: `${fmt(item.maxChargingCurrentA ?? 0, 0)} A` },
      { label: tr('picker.miseEnParallele'), value: item.canBeInParallel ? fill(tr('picker.upTo'), { count: fmt(item.maxParallelUnits ?? 0, 0) }) : tr('picker.no') },
    ],
  };
}

export function EquipmentPicker({
  kind,
  project,
  equipment: availableEquipment,
  compatibleIds,
  onPick,
  onClose,
}: {
  kind: Kind;
  project: ProjectViewModel;
  equipment?: readonly Equipment[];
  compatibleIds?: readonly string[];
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<CatalogFilterState>(emptyCatalogFilters);
  const { equipment: catalogEquipment } = useCatalog();
  const favorites = useSettings((state) => state.sizing.favorites[kind]);
  const equipment = availableEquipment ?? catalogEquipment;
  const current = kind === 'module'
    ? project.selection.moduleId
    : kind === 'battery'
      ? project.selection.batteryId
      : project.selection.inverterId;
  const familyEquipment = useMemo(() => equipment.filter((item) => item.kind === canonicalKind[kind]
    && (kind !== 'inverter' || compatibleIds === undefined || compatibleIds.includes(item.id))), [compatibleIds, equipment, kind]);
  const options = useMemo(() => catalogOptions(familyEquipment, query, filters), [familyEquipment, filters, query]);
  const rows = useMemo(() => {
    // La sélection en cours, puis « Mes références », puis le reste du catalogue.
    const matching = filterEquipment(familyEquipment, query, filters);
    const rank = (item: Equipment) => item.id === current ? 0 : favorites.includes(item.id) ? 1 : 2;
    return matching.map((item, index) => ({ item, index })).sort((left, right) => rank(left.item) - rank(right.item) || left.index - right.index).map(({ item }) => item).slice(0, 24);
  }, [current, familyEquipment, favorites, filters, query]);
  const setFilter = (key: keyof CatalogFilterState, value: string) => setFilters((before) => ({ ...before, [key]: value }));
  const resetFilters = () => { setQuery(''); setFilters(emptyCatalogFilters); };

  return (
    <Dialog
      title={t(TITLE[kind])}
      lead={kind === 'inverter' ? fill(t('picker.compatibleLead'), { count: rows.length }) : t('picker.caracteristiquesCatalogueCompletesEt')}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="label">{t('picker.laSelectionRecalculeImmediatement')}</span>
          <button className="btn btn-ghost" onClick={onClose}>{t('g.close')}</button>
        </>
      }
    >
      <input
        className="dlg-search"
        autoFocus
        placeholder={t('picker.filtrerParCodeFabricant')}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="catalog-filters picker-filters" aria-label={t('catalog.filters')}>
        <select value={filters.manufacturer} onChange={(event) => setFilter('manufacturer', event.target.value)} aria-label={t('catalog.manufacturer')}><option value="">{t('catalog.filter.manufacturers')}</option>{options.manufacturers.map((value) => <option key={value}>{value}</option>)}</select>
        {kind !== 'inverter' && <select value={filters.technology} onChange={(event) => setFilter('technology', event.target.value)} aria-label={t('catalog.technology')}><option value="">{t('catalog.filter.technologies')}</option>{options.technologies.map((value) => <option key={value}>{value}</option>)}</select>}
        {kind === 'inverter' && <select value={filters.type} onChange={(event) => setFilter('type', event.target.value)} aria-label={t('catalog.type')}><option value="">{t('catalog.filter.types')}</option>{options.types.map((value) => <option key={value}>{value}</option>)}</select>}
        <input inputMode="decimal" placeholder={kind === 'battery' ? t('catalog.filter.minCapacity') : t('catalog.filter.minPower')} value={filters.minPower} onChange={(event) => setFilter('minPower', event.target.value)} />
        <input inputMode="decimal" placeholder={kind === 'battery' ? t('catalog.filter.maxCapacity') : t('catalog.filter.maxPower')} value={filters.maxPower} onChange={(event) => setFilter('maxPower', event.target.value)} />
        <input inputMode="decimal" placeholder={t('catalog.filter.minVoltage')} value={filters.minVoltage} onChange={(event) => setFilter('minVoltage', event.target.value)} />
        <input inputMode="decimal" placeholder={t('catalog.filter.maxVoltage')} value={filters.maxVoltage} onChange={(event) => setFilter('maxVoltage', event.target.value)} />
        <button type="button" className="btn" onClick={resetFilters}>{t('catalog.filter.reset')}</button>
      </div>
      <div className="pick-columns" aria-hidden="true">
        <span>{t('picker.referenceCatalogue')}</span>
        <span>{t('picker.caracteristiques')}</span>
        <span>{t('picker.etat')}</span>
      </div>
      <div className="pick-list pick-list-catalog">
        {rows.length === 0 && <div className="empty"><b>{t('equipment.noneFound')}</b></div>}
        {rows.map((item) => {
          const itemDetails = details(item);
          return (
            <button
              key={item.id}
              className={`pick-row ${item.id === current ? 'on' : ''}`}
              onClick={() => onPick(item.id)}
              title={`Source : ${item.provenance.sourceId}`}
            >
              <span className="pick-id">
                <b>{favorites.includes(item.id) && <span className="fav-mark" title={t('catalog.myReferences')}>★ </span>}{item.model}</b>
                <small>{item.manufacturer} · {itemDetails.technology}</small>
              </span>
              <span className="pick-spec">
                <strong>{itemDetails.specs}</strong>
                <span className="pick-spec-grid">
                  {itemDetails.characteristics.map((characteristic) => (
                    <span key={characteristic.label}>
                      <small>{characteristic.label}</small>
                      <b>{characteristic.value}</b>
                    </span>
                  ))}
                </span>
              </span>
              <span className="pick-state">
                {item.id === current
                  ? <span className="badge ok">{t('picker.retenu')}</span>
                  : kind === 'inverter'
                    ? <span className="badge ok">{t('picker.compatible')}</span>
                    : <span className="pick-action">{t('picker.choisir')}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
