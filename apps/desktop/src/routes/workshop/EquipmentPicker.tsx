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

function details(item: Equipment): { readonly technology: string; readonly specs: string } {
  if (item.kind === 'pv-module') {
    return {
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalPowerW)} Wc · ${fmt(item.openCircuitVoltageV, 1)} V`,
    };
  }
  if (item.kind === 'battery') {
    return {
      technology: item.technology ?? 'Technologie non renseignée',
      specs: `${fmt(item.nominalCapacityAh)} Ah · ${fmt(item.nominalVoltageV)} V`,
    };
  }
  return {
    technology: item.inverterType ?? 'Type non renseigné',
    specs: `${fmt(item.nominalAcPowerW / 1000, 1)} kW · ${fmt(item.nominalDcVoltageV)} Vdc`,
  };
}

export function EquipmentPicker({
  kind,
  project,
  onPick,
  onClose,
}: {
  kind: Kind;
  project: ProjectViewModel;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const { equipment } = useCatalog();
  const current = kind === 'module'
    ? project.selection.moduleId
    : kind === 'battery'
      ? project.selection.batteryId
      : project.selection.inverterId;
  const needle = query.trim().toLocaleLowerCase();
  const rows = useMemo(() => {
    const matching = equipment.filter((item) => {
      if (item.kind !== canonicalKind[kind]) return false;
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
      lead="références canoniques · compatibilité prévue dans EQP-001"
      wide
      onClose={onClose}
      footer={
        <>
          <span className="label">Aucune compatibilité ni quantité n’est déduite dans cette étape.</span>
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
              <span className="pick-spec">{itemDetails.specs}</span>
              <span className="badge">{item.id === current ? 'retenu' : ''}</span>
            </button>
          );
        })}
      </div>
    </Dialog>
  );
}
