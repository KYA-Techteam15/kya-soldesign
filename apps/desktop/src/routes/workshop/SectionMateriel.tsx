import { useMemo, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { StepHead } from '../../ui/Flow';
import { EquipmentPicker, type Kind } from './EquipmentPicker';
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { fmt } from '../../domain/format';
import { useT } from '../../i18n';

function PickRow({ index, role, equipment, onPick }: { readonly index: number; readonly role: string; readonly equipment: Equipment | null; readonly onPick: () => void }) {
  const t = useT();
  const specs = equipment?.kind === 'pv-module'
    ? `${fmt(equipment.nominalPowerW)} Wc · ${fmt(equipment.openCircuitVoltageV, 1)} V`
    : equipment?.kind === 'battery'
      ? `${fmt(equipment.nominalCapacityAh)} Ah · ${fmt(equipment.nominalVoltageV)} V`
      : equipment?.kind === 'inverter'
        ? `${fmt(equipment.nominalAcPowerW / 1000, 1)} kW · ${fmt(equipment.nominalDcVoltageV)} Vdc`
        : null;
  return <div className="pickrow"><span className="pickrow-n">{index}</span><span className="pickrow-role">{role}</span><span className="pickrow-main">{equipment ? <><b>{equipment.model}</b><small>{equipment.manufacturer} · {specs}</small></> : <><b>{t('equipment.none')}</b><small>{t('equipment.chooseHelp')}</small></>}</span><button className="btn" onClick={onPick}>{t('equipment.choose')}</button></div>;
}

export function SectionMateriel() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const { equipment, status } = useCatalog();
  const compatibility = useCalculationState(project.id, 'equipment-compatibility', project.updatedAt);
  const sizing = useCalculationState(project.id, 'sizing', project.updatedAt);
  const [picker, setPicker] = useState<Kind | null>(null);
  const selected = useMemo(() => ({
    module: equipment.find((item) => item.kind === 'pv-module' && item.id === project.selection.moduleId) ?? null,
    battery: equipment.find((item) => item.kind === 'battery' && item.id === project.selection.batteryId) ?? null,
    inverter: equipment.find((item) => item.kind === 'inverter' && item.id === project.selection.inverterId) ?? null,
  }), [equipment, project.selection]);
  const pick = (kind: Kind, id: string) => {
    update((draft) => {
      if (kind === 'module') draft.selection.moduleId = id;
      if (kind === 'battery') draft.selection.batteryId = id;
      if (kind === 'inverter') draft.selection.inverterId = id;
    });
    setPicker(null);
  };

  return <div className="sheet">
    <StepHead slug="materiel" aside={<span className="label">{status === 'ready' ? `${equipment.length} références canoniques` : 'Catalogue en lecture…'}</span>} />
    <section className="targets"><span className="targets-tag">{t('equipment.toCover')}</span>{['Champ PV · kWc', 'Stockage · kWh', 'Onduleur · kW'].map((label) => <div className="tgt" key={label}><span className="tgt-lbl">{label}</span><span className="tgt-val"><b>—</b></span></div>)}</section>
    <CapabilityNotice capability="sizing" state={sizing} compact />
    <section><h2 className="h-sec">{t('equipment.catalogComponents')}</h2><div className="picklist">
      <PickRow index={1} role="Module" equipment={selected.module} onPick={() => setPicker('module')} />
      <PickRow index={2} role="Batterie" equipment={selected.battery} onPick={() => setPicker('battery')} />
      <PickRow index={3} role="Onduleur" equipment={selected.inverter} onPick={() => setPicker('inverter')} />
    </div></section>
    <section><div className="tbl-title"><h2 className="h-sec">{t('equipment.compatibility')}</h2><span className="sep" /></div><CapabilityNotice capability="equipment-compatibility" state={compatibility} /></section>
    <div className="runbar is-stale"><button className="btn btn-ok btn-run" disabled>{t('equipment.sizingUnavailable')}</button><span className="runbar-note">Les références sont enregistrées sans recommandation, quantité ni réserve fabriquée.</span></div>
    <section className="out is-stale"><div className="out-head"><span className="out-tag">{t('g.unavailable')}</span><h2 className="h-sec">{t('equipment.selectedSystem')}</h2></div><div className="fitgrid">{['Champ PV', 'Parc batteries', 'Onduleurs'].map((label) => <div className="fitcell" key={label}><span className="out-lbl">{label}</span><div className="fitline"><span>{t('equipment.required')}</span><b>—</b></div><div className="fitline"><span>{t('equipment.obtained')}</span><b>—</b></div></div>)}</div></section>
    {picker && <EquipmentPicker kind={picker} project={project} onPick={(id) => pick(picker, id)} onClose={() => setPicker(null)} />}
  </div>;
}
