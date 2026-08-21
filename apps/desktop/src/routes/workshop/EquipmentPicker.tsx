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

function details(item: Equipment): { readonly technology: string; readonly specs: string; readonly characteristics: readonly string[] } {
  if (item.kind === 'pv-module') {
    return {
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalPowerW)} Wc · ${fmt(item.openCircuitVoltageV, 1)} V`,
      characteristics: [`Vmp ${fmt(item.voltageAtMaximumPowerV, 1)} V`, `Imp ${fmt(item.currentAtMaximumPowerA, 2)} A`, `Isc ${fmt(item.shortCircuitCurrentA, 2)} A`, `Coeff. Pmax ${fmt(item.temperatureCoefficientPmaxPerC ?? 0, 3)} /°C`, `Coeff. Voc ${fmt(item.temperatureCoefficientVocPerC ?? 0, 3)} /°C`, `NOCT ${fmt(item.nominalOperatingCellTemperatureC ?? 0, 1)} °C`, `Surface ${fmt(item.areaM2 ?? 0, 2)} m²`],
    };
  }
  if (item.kind === 'battery') {
    return {
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalCapacityAh ?? 0)} Ah · ${fmt(item.nominalVoltageV ?? 0)} V`,
      characteristics: [`Énergie ${fmt(item.nominalEnergyWh / 1000, 2)} kWh`, `DoD utile ${fmt((item.usableDepthOfDischargeRatio ?? 0) * 100, 0)} %`, `Rendement ${fmt((item.roundTripEfficiencyRatio ?? 0) * 100, 0)} %`, `Cycles ${fmt(item.cycleLife ?? 0, 0)}`],
    };
  }
  return {
    technology: item.inverterType ?? 'Type non renseigné',
    specs: `${fmt(item.nominalAcPowerW / 1000, 1)} kW · ${fmt(item.nominalDcVoltageV)} Vdc`,
    characteristics: [`Surcharge ${fmt((item.surgePowerW ?? 0) / 1000, 1)} kW`, `Sortie ${fmt(item.nominalAcVoltageV ?? 0, 0)} Vac`, `Rendement ${fmt((item.efficiencyRatio ?? 0) * 100, 1)} %`, `PV max ${fmt((item.pvArrayMaxPowerW ?? 0) / 1000, 1)} kWc`, `MPPT ${fmt(item.mpptMinVoltageV ?? 0, 0)}–${fmt(item.mpptMaxVoltageV ?? 0, 0)} V`, `Voc max ${fmt(item.pvOpenCircuitMaxVoltageV ?? 0, 0)} V`, `${fmt(item.pvInputsNumber ?? 0, 0)} entrées PV`, `Charge ${fmt(item.maxChargingCurrentA ?? 0, 0)} A`, `Parallèle ${item.canBeInParallel ? `jusqu’à ${fmt(item.maxParallelUnits ?? 0, 0)}` : 'non'}`],
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
      <div className="pick-list">
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
              <span className="pick-spec">{itemDetails.specs}<small>{itemDetails.characteristics.join(' · ')}</small></span>
              <span className="badge">{item.id === current ? 'retenu' : ''}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
