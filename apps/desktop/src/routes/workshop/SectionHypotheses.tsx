import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';

const FAMILIES = [
  { key: 'tech', label: 'Technique', hint: 'rendements, seuils, tension du parc' },
  { key: 'costs', label: 'Coûts & référence', hint: 'coûts spécifiques, marges, tarif réseau' },
  { key: 'life', label: 'Durées de vie', hint: 'remplacements, entretien, actualisation' },
] as const;
type Family = (typeof FAMILIES)[number]['key'];

function PendingValue({ label, unit, lead = false }: { readonly label: string; readonly unit?: string; readonly lead?: boolean }) {
  return <div className={`out-cell is-pending ${lead ? 'is-lead' : ''}`}><span className="out-lbl">{label}</span><span className="out-val"><b>—</b>{unit && <span className="unit">{unit}</span>}</span></div>;
}

export function SectionHypotheses() {
  const project = useProject();
  const update = useProjects((state) => state.update);
  const assumptions = project.assumptions;
  const state = useCalculationState(project.id, 'presizing', project.updatedAt);
  const [family, setFamily] = useState<Family>('tech');
  const [open, setOpen] = useState(false);
  const set = (key: keyof typeof assumptions) => (value: number) => update((draft) => { (draft.assumptions[key] as number) = value; });

  return <div className="sheet">
    <StepHead slug="hypotheses" aside={<button className="btn" onClick={() => setOpen(true)}>Hypothèses de calcul…</button>} />
    <section><h2 className="h-sec">Critères de l’étude</h2><div className="form-rows">
      <NumField label="LPSP maximale" unit="%" value={assumptions.lpspMax} onChange={set('lpspMax')} decimals={1} />
      <NumField label="LOLP maximale" unit="%" value={assumptions.lolpMax} onChange={set('lolpMax')} decimals={1} />
      <NumField label="Tarif réseau de référence" unit="FCFA/kWh" value={assumptions.lcoeGrid} onChange={set('lcoeGrid')} />
    </div></section>
    <div className="runbar is-stale"><button className="btn btn-ok btn-run" disabled>Prédimensionnement indisponible</button><span className="runbar-note">Aucun moteur n’est chargé dans l’application de production.</span></div>
    <CapabilityNotice capability="presizing" state={state} compact />
    <section className="out is-stale"><div className="out-head"><span className="out-tag">indisponible</span><h2 className="h-sec">Système minimal à installer</h2></div><div className="out-grid">
      <PendingValue label="Puissance crête du champ PV" unit="kWc" lead />
      <PendingValue label="Puissance onduleur minimale" unit="kW" lead />
      <PendingValue label="Énergie stockée minimale" unit="kWh" lead />
      <PendingValue label="Production annuelle" unit="kWh/an" />
    </div></section>
    <section className="out is-stale"><div className="out-head"><span className="out-tag">indisponible</span><h2 className="h-sec">Fiabilité &amp; économie</h2></div><div className="out-grid">
      {['LPSP', 'LOLP', 'SRI', 'Coût du kWh produit', 'SVI', 'CO₂ évité'].map((label) => <PendingValue key={label} label={label} />)}
    </div></section>
    {open && <Dialog title="Hypothèses de calcul" lead={FAMILIES.find((item) => item.key === family)?.hint} wide onClose={() => setOpen(false)} footer={<button className="btn-primary" onClick={() => setOpen(false)}>Fermer</button>}>
      <div className="seg" role="tablist" style={{ marginBottom: 'var(--sp-4)' }}>{FAMILIES.map((item) => <button key={item.key} role="tab" aria-selected={family === item.key} onClick={() => setFamily(item.key)}>{item.label}</button>)}</div>
      {family === 'tech' && <div className="form-rows">
        <NumField label="Performance ratio" unit="%" value={assumptions.systemPr} onChange={set('systemPr')} decimals={1} />
        <NumField label="Rendement onduleur" unit="%" value={assumptions.inverterYield} onChange={set('inverterYield')} decimals={1} />
        <NumField label="Rendement batterie" unit="%" value={assumptions.batteryYield} onChange={set('batteryYield')} decimals={1} />
        <NumField label="Tension du parc" unit="V" value={assumptions.batteryVoltage} onChange={set('batteryVoltage')} />
        <NumField label="Profondeur de décharge" unit="%" value={assumptions.batteryDod} onChange={set('batteryDod')} decimals={1} />
        <NumField label="Seuil d’irradiance minimale" unit="W/m²" value={project.load.irMin} onChange={(value) => update((draft) => { draft.load.irMin = value; })} />
      </div>}
      {family === 'costs' && <div className="form-rows">
        <NumField label="Coût PV" unit="FCFA/kWc" value={assumptions.pvSpecificCost} onChange={set('pvSpecificCost')} />
        <NumField label="Marge PV" unit="%" value={assumptions.pvMargin} onChange={set('pvMargin')} decimals={1} />
        <NumField label="Coût batterie" unit="FCFA/kWh" value={assumptions.batterySpecificCost} onChange={set('batterySpecificCost')} />
        <NumField label="Marge batterie" unit="%" value={assumptions.batteryMargin} onChange={set('batteryMargin')} decimals={1} />
        <NumField label="Coût onduleur" unit="FCFA/kW" value={assumptions.inverterSpecificCost} onChange={set('inverterSpecificCost')} />
        <NumField label="Marge onduleur" unit="%" value={assumptions.inverterMargin} onChange={set('inverterMargin')} decimals={1} />
        <NumField label="Facteur d’émission" unit="kgCO₂/kWh" value={assumptions.emissionFactor} onChange={set('emissionFactor')} decimals={2} />
        <NumField label="Taux d’autoconsommation" unit="%" value={assumptions.autoConsumptionRate} onChange={set('autoConsumptionRate')} decimals={1} />
      </div>}
      {family === 'life' && <div className="form-rows">
        <NumField label="Durée de vie du projet" unit="ans" value={assumptions.projectLifetime} onChange={set('projectLifetime')} />
        <NumField label="Modules PV" unit="ans" value={assumptions.pvLifetime} onChange={set('pvLifetime')} />
        <NumField label="Batteries" unit="ans" value={assumptions.batteryLifetime} onChange={set('batteryLifetime')} />
        <NumField label="Onduleur" unit="ans" value={assumptions.inverterLifetime} onChange={set('inverterLifetime')} />
        <NumField label="Maintenance PV" unit="%/an" value={assumptions.pvMaintenance} onChange={set('pvMaintenance')} decimals={1} />
        <NumField label="Maintenance batterie" unit="%/an" value={assumptions.batteryMaintenance} onChange={set('batteryMaintenance')} decimals={1} />
        <NumField label="Maintenance onduleur" unit="%/an" value={assumptions.inverterMaintenance} onChange={set('inverterMaintenance')} decimals={1} />
        <NumField label="Taux d’actualisation" unit="%" value={assumptions.actualizationRate} onChange={set('actualizationRate')} decimals={1} />
      </div>}
    </Dialog>}
  </div>;
}
