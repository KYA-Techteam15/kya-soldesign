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
import { useT } from '../../i18n';

export type Kind = 'module' | 'battery' | 'inverter';

const TITLE: Record<Kind, string> = {
  module: 'Choisir un module',
  battery: 'Choisir une batterie',
  inverter: 'Choisir un onduleur',
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
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalPowerW)} Wc · ${fmt(item.openCircuitVoltageV, 1)} V`,
      characteristics: [
        { label: 'Vmp', value: `${fmt(item.voltageAtMaximumPowerV, 1)} V` },
        { label: 'Imp', value: `${fmt(item.currentAtMaximumPowerA, 2)} A` },
        { label: 'Isc', value: `${fmt(item.shortCircuitCurrentA, 2)} A` },
        { label: 'Coeff. Pmax', value: `${fmt(item.temperatureCoefficientPmaxPerC ?? 0, 3)} /°C` },
        { label: 'Coeff. Voc', value: `${fmt(item.temperatureCoefficientVocPerC ?? 0, 3)} /°C` },
        { label: 'NOCT', value: `${fmt(item.nominalOperatingCellTemperatureC ?? 0, 1)} °C` },
        { label: 'Surface', value: `${fmt(item.areaM2 ?? 0, 2)} m²` },
      ],
    };
  }
  if (item.kind === 'battery') {
    return {
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalCapacityAh ?? 0)} Ah · ${fmt(item.nominalVoltageV ?? 0)} V`,
      characteristics: [
        { label: 'Énergie', value: `${fmt(item.nominalEnergyWh / 1000, 2)} kWh` },
        { label: 'DoD utile', value: `${fmt((item.usableDepthOfDischargeRatio ?? 0) * 100, 0)} %` },
        { label: 'Rendement', value: `${fmt((item.roundTripEfficiencyRatio ?? 0) * 100, 0)} %` },
        { label: 'Durée de vie', value: `${fmt(item.cycleLife ?? 0, 0)} cycles` },
      ],
    };
  }
  return {
    technology: item.inverterType ?? 'Type non renseigné',
    specs: `${fmt(item.nominalAcPowerW / 1000, 1)} kW · ${fmt(item.nominalDcVoltageV)} Vdc`,
    characteristics: [
      { label: 'Surcharge', value: `${fmt((item.surgePowerW ?? 0) / 1000, 1)} kW` },
      { label: 'Sortie', value: `${fmt(item.nominalAcVoltageV ?? 0, 0)} Vac` },
      { label: 'Rendement', value: `${fmt((item.efficiencyRatio ?? 0) * 100, 1)} %` },
      { label: 'Champ PV max', value: `${fmt((item.pvArrayMaxPowerW ?? 0) / 1000, 1)} kWc` },
      { label: 'Plage MPPT', value: `${fmt(item.mpptMinVoltageV ?? 0, 0)}–${fmt(item.mpptMaxVoltageV ?? 0, 0)} V` },
      { label: 'Voc PV max', value: `${fmt(item.pvOpenCircuitMaxVoltageV ?? 0, 0)} V` },
      { label: 'Entrées PV', value: fmt(item.pvInputsNumber ?? 0, 0) },
      { label: 'Courant de charge', value: `${fmt(item.maxChargingCurrentA ?? 0, 0)} A` },
      { label: 'Mise en parallèle', value: item.canBeInParallel ? `jusqu’à ${fmt(item.maxParallelUnits ?? 0, 0)}` : 'non' },
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
  const { equipment: catalogEquipment } = useCatalog();
  const equipment = availableEquipment ?? catalogEquipment;
  const current = kind === 'module'
    ? project.selection.moduleId
    : kind === 'battery'
      ? project.selection.batteryId
      : project.selection.inverterId;
  const needle = query.trim().toLocaleLowerCase();
  const rows = useMemo(() => {
    const matching = equipment.filter((item) => {
      if (item.kind !== canonicalKind[kind]) return false;
      if (kind === 'inverter' && compatibleIds !== undefined && !compatibleIds.includes(item.id)) return false;
      const technical = details(item).technology;
      return needle.length === 0
        || `${item.model} ${item.manufacturer} ${technical}`.toLocaleLowerCase().includes(needle);
    });
    const currentIndex = matching.findIndex((item) => item.id === current);
    if (currentIndex <= 0) return matching.slice(0, 24);
    return [matching[currentIndex]!, ...matching.filter((_, index) => index !== currentIndex).slice(0, 23)];
  }, [current, equipment, kind, needle]);

  return (
    <Dialog
      title={TITLE[kind]}
      lead={kind === 'inverter' ? `${rows.length} références compatibles avec le module et la batterie retenus` : 'caractéristiques catalogue complètes et effet immédiat sur le dimensionnement'}
      wide
      onClose={onClose}
      footer={
        <>
          <span className="label">La sélection recalcule immédiatement la configuration retenue.</span>
          <button className="btn btn-ghost" onClick={onClose}>{t('g.close')}</button>
        </>
      }
    >
      <input
        className="dlg-search"
        autoFocus
        placeholder="Filtrer par code, fabricant ou technologie…"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="pick-columns" aria-hidden="true">
        <span>Référence catalogue</span>
        <span>Caractéristiques</span>
        <span>État</span>
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
                <b>{item.model}</b>
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
                  ? <span className="badge ok">Retenu</span>
                  : kind === 'inverter'
                    ? <span className="badge ok">Compatible</span>
                    : <span className="pick-action">Choisir</span>}
              </span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
