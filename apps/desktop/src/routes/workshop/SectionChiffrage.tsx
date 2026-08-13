import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';

const ACCESSORIES = [
  { key: 'cabling', label: 'Câblage' },
  { key: 'electricalBox', label: 'Coffret électrique' },
  { key: 'supports', label: 'Supports' },
  { key: 'transport', label: 'Transport' },
  { key: 'installation', label: 'Installation' },
] as const;

function MainCost({ role, unitPrice, margin, onPrice, onMargin }: { readonly role: string; readonly unitPrice: number; readonly margin: number; readonly onPrice: (value: number) => void; readonly onMargin: (value: number) => void }) {
  return <div className="costrow"><span className="costrow-role">{role}</span><span className="costrow-qty"><b>—</b><span className="unit">u</span></span><div className="costrow-fld"><NumField label="" unit="FCFA" value={unitPrice} onChange={onPrice} /></div><div className="costrow-fld"><NumField label="" unit="%" value={margin} onChange={onMargin} decimals={1} /></div><span className="costrow-total"><b>—</b><span className="unit">FCFA</span></span></div>;
}

export function SectionChiffrage() {
  const project = useProject();
  const update = useProjects((state) => state.update);
  const costing = project.costing;
  const state = useCalculationState(project.id, 'finance', project.updatedAt);
  const [showTerms, setShowTerms] = useState(false);
  const set = (key: keyof typeof costing) => (value: number) => update((draft) => { (draft.costing[key] as number) = value; });
  return <div className="sheet">
    <StepHead slug="chiffrage" aside={<button className="btn" onClick={() => setShowTerms(true)}>Conditions commerciales…</button>} />
    <section className="targets"><span className="targets-tag">quantités</span>{['Modules', 'Batteries', 'Onduleurs'].map((label) => <div className="tgt" key={label}><span className="tgt-lbl">{label}</span><span className="tgt-val"><b>—</b><span className="unit">u</span></span></div>)}</section>
    <CapabilityNotice capability="finance" state={state} compact />
    <section><div className="tbl-title"><h2 className="h-sec">Matériel principal</h2><span className="sep" /><span className="label">prix unitaires · marge par famille</span></div><div className="costlist"><div className="costhead"><span /><span>Qté</span><span>Prix de revient unitaire</span><span>Marge</span><span className="ta-r">Total vente</span></div>
      <MainCost role="Modules" unitPrice={costing.moduleUnitPrice} margin={costing.moduleMargin} onPrice={set('moduleUnitPrice')} onMargin={set('moduleMargin')} />
      <MainCost role="Batteries" unitPrice={costing.batteryUnitPrice} margin={costing.batteryMargin} onPrice={set('batteryUnitPrice')} onMargin={set('batteryMargin')} />
      <MainCost role="Onduleurs" unitPrice={costing.inverterUnitPrice} margin={costing.inverterMargin} onPrice={set('inverterUnitPrice')} onMargin={set('inverterMargin')} />
    </div></section>
    <section><div className="tbl-title"><h2 className="h-sec">Autres frais</h2><span className="sep" /><span className="label">{costing.definedCostForAccessories ? 'en valeur' : 'en % du matériel principal'}</span><button className="btn" onClick={() => update((draft) => { draft.costing.definedCostForAccessories = !draft.costing.definedCostForAccessories; })}>Basculer</button></div><div className="acclist">
      {ACCESSORIES.map((accessory) => { const priceKey = `${accessory.key}Price` as keyof typeof costing; const marginKey = `${accessory.key}Margin` as keyof typeof costing; return <div className="accitem" key={accessory.key}><span className="accitem-lbl">{accessory.label}</span><div className="accitem-pair"><div className="accrow-fld"><NumField label="" unit={costing.definedCostForAccessories ? 'FCFA' : '%'} value={costing[priceKey] as number} onChange={set(priceKey)} decimals={costing.definedCostForAccessories ? 0 : 1} /></div><div className="accrow-fld accrow-fld-m"><NumField label="" unit="%" value={costing[marginKey] as number} onChange={set(marginKey)} decimals={1} /></div></div></div>; })}
    </div></section>
    <section className="out is-stale"><div className="out-head"><span className="out-tag">indisponible</span><h2 className="h-sec">Prix de vente</h2></div><div className="out-grid out-grid-4">{['Total TTC', 'Vente HT', `TVA ${costing.tvaPercent} %`, 'Prix du Wc'].map((label) => <div className="out-cell is-pending" key={label}><span className="out-lbl">{label}</span><span className="out-val"><b>—</b></span></div>)}</div></section>
    {showTerms && <Dialog title="Conditions commerciales" lead="taxes, remise et engagements de l’offre" wide onClose={() => setShowTerms(false)} footer={<button className="btn-primary" onClick={() => setShowTerms(false)}>Fermer</button>}><div className="form-rows">
      <NumField label="TVA" unit="%" value={costing.tvaPercent} onChange={set('tvaPercent')} decimals={1} />
      <NumField label="Remise" unit="%" value={costing.reductionPercent} onChange={set('reductionPercent')} decimals={1} />
      <NumField label="Acompte à la commande" unit="%" value={costing.downPaymentPercent} onChange={set('downPaymentPercent')} decimals={1} />
      <NumField label="Délai de livraison" unit="jours" value={costing.deliveryTime} onChange={set('deliveryTime')} />
      <NumField label="Validité de l’offre" unit="jours" value={costing.offerValidity} onChange={set('offerValidity')} />
      <NumField label="Garantie" unit="mois" value={costing.productWarranty} onChange={set('productWarranty')} />
    </div></Dialog>}
  </div>;
}
