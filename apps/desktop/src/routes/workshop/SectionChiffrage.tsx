import { useEffect, useState } from 'react';
import type { FinanceOutputV1, PresizingOutputV1, SizingOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { useT } from '../../i18n';
import { fmt } from '../../domain/format';

const ACCESSORIES = [
  { key: 'cabling', label: 'Câblage' },
  { key: 'electricalBox', label: 'Coffret électrique' },
  { key: 'supports', label: 'Supports' },
  { key: 'transport', label: 'Transport' },
  { key: 'installation', label: 'Installation' },
] as const;

const percentDelta = (before: number, after: number) => before === 0 ? null : (after / before - 1) * 100;
const deltaClass = (delta: number | null, lowerIsBetter = false) => delta === null || Math.abs(delta) < 0.05 ? '' : (lowerIsBetter ? delta < 0 : delta > 0) ? 'good' : 'bad';

function MainCost({ role, quantity, total, unitPrice, margin, onPrice, onMargin }: { readonly role: string; readonly quantity: number; readonly total: number | null; readonly unitPrice: number; readonly margin: number; readonly onPrice: (value: number) => void; readonly onMargin: (value: number) => void }) {
  return <div className="costrow"><span className="costrow-role">{role}</span><span className="costrow-qty"><b>{fmt(quantity)}</b><span className="unit">u</span></span><div className="costrow-fld"><NumField label="" unit="FCFA" value={unitPrice} onChange={onPrice} /></div><div className="costrow-fld"><NumField label="" unit="%" value={margin} onChange={onMargin} decimals={1} /></div><span className="costrow-total"><b>{total === null ? '—' : fmt(total)}</b><span className="unit">FCFA</span></span></div>;
}

export function SectionChiffrage() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const costing = project.costing;
  const state = useCalculationState<FinanceOutputV1>(project.id, 'finance', project.updatedAt);
  const sizingState = useCalculationState<SizingOutputV1>(project.id, 'sizing', project.updatedAt);
  const presizingState = useCalculationState<PresizingOutputV1>(project.id, 'presizing', project.updatedAt);
  const result = state.status === 'ready' ? state.envelope.output : null;
  const sizing = sizingState.status === 'ready' ? sizingState.envelope.output : null;
  const presizing = presizingState.status === 'ready' ? presizingState.envelope.output.selected : null;
  const [showTerms, setShowTerms] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [showLife, setShowLife] = useState(false);
  const costingNotInitialized = costing.moduleUnitPrice === 0 && costing.batteryUnitPrice === 0 && costing.inverterUnitPrice === 0;
  const effective = {
    moduleUnitPrice: costing.moduleUnitPrice > 0 ? costing.moduleUnitPrice : (sizing?.pv.obtainedPowerKwc ?? 0) / Math.max(sizing?.pv.totalModules ?? 0, 1) * project.assumptions.pvSpecificCost,
    batteryUnitPrice: costing.batteryUnitPrice > 0 ? costing.batteryUnitPrice : (sizing?.battery.obtainedEnergyKwh ?? 0) / Math.max(sizing?.battery.totalUnits ?? 0, 1) * project.assumptions.batterySpecificCost,
    inverterUnitPrice: costing.inverterUnitPrice > 0 ? costing.inverterUnitPrice : (sizing?.inverter.obtainedPowerKw ?? 0) / Math.max(sizing?.inverter.count ?? 0, 1) * project.assumptions.inverterSpecificCost,
    moduleMargin: costingNotInitialized ? project.assumptions.pvMargin : costing.moduleMargin,
    batteryMargin: costingNotInitialized ? project.assumptions.batteryMargin : costing.batteryMargin,
    inverterMargin: costingNotInitialized ? project.assumptions.inverterMargin : costing.inverterMargin,
  };
  const mainCost = result?.lines.filter((line) => ['modules', 'batteries', 'inverters'].includes(line.key)).reduce((sum, line) => sum + line.totalCost, 0) ?? 0;
  useEffect(() => {
    if (!sizing || !costingNotInitialized) return;
    update((draft) => {
      draft.costing.moduleUnitPrice = sizing.pv.obtainedPowerKwc / Math.max(sizing.pv.totalModules, 1) * draft.assumptions.pvSpecificCost;
      draft.costing.batteryUnitPrice = sizing.battery.obtainedEnergyKwh / Math.max(sizing.battery.totalUnits, 1) * draft.assumptions.batterySpecificCost;
      draft.costing.inverterUnitPrice = sizing.inverter.obtainedPowerKw / Math.max(sizing.inverter.count, 1) * draft.assumptions.inverterSpecificCost;
      draft.costing.moduleMargin = draft.assumptions.pvMargin;
      draft.costing.batteryMargin = draft.assumptions.batteryMargin;
      draft.costing.inverterMargin = draft.assumptions.inverterMargin;
    });
  }, [costingNotInitialized, sizing, update]);
  const set = (key: keyof typeof costing) => (value: number) => update((draft) => { (draft.costing[key] as number) = value; });
  const toggleAccessoryMode = () => update((draft) => {
    if (mainCost <= 0) return;
    for (const accessory of ACCESSORIES) {
      const key = `${accessory.key}Price` as keyof typeof draft.costing;
      const value = draft.costing[key] as number;
      (draft.costing[key] as number) = draft.costing.definedCostForAccessories ? value / mainCost * 100 : value / 100 * mainCost;
    }
    draft.costing.definedCostForAccessories = !draft.costing.definedCostForAccessories;
  });
  return <div className="sheet">
    <StepHead slug="chiffrage" aside={<button className="btn" onClick={() => setShowTerms(true)}>{t('costing.terms')}</button>} />
    <section className="targets"><span className="targets-tag">{t('costing.quantities')}</span>{[['Modules', sizing?.pv.totalModules ?? 0], ['Batteries', sizing?.battery.totalUnits ?? 0], ['Onduleurs', sizing?.inverter.count ?? 0]].map(([label, quantity]) => <div className="tgt" key={label}><span className="tgt-lbl">{label}</span><span className="tgt-val"><b>{fmt(quantity as number)}</b><span className="unit">u</span></span></div>)}<span className="sep" /><span className={'tgt-got ' + (sizing ? 'ok' : '')}>{sizing ? 'issues du dimensionnement' : 'étape 5 requise'}</span></section>
    {state.status !== 'ready' && <CapabilityNotice capability="finance" state={state} compact />}
    <section><div className="tbl-title"><h2 className="h-sec">{t('costing.mainEquipment')}</h2><span className="sep" /><span className="label">{t('costing.unitPrices')}</span></div><div className="costlist"><div className="costhead"><span /><span>{t('loads.quantity')}</span><span>{t('costing.unitCost')}</span><span>{t('costing.margin')}</span><span className="ta-r">{t('costing.saleTotal')}</span></div>
      <MainCost role="Modules" quantity={sizing?.pv.totalModules ?? 0} total={result?.lines.find((line) => line.key === 'modules')?.totalSale ?? null} unitPrice={effective.moduleUnitPrice} margin={effective.moduleMargin} onPrice={set('moduleUnitPrice')} onMargin={set('moduleMargin')} />
      <MainCost role="Batteries" quantity={sizing?.battery.totalUnits ?? 0} total={result?.lines.find((line) => line.key === 'batteries')?.totalSale ?? null} unitPrice={effective.batteryUnitPrice} margin={effective.batteryMargin} onPrice={set('batteryUnitPrice')} onMargin={set('batteryMargin')} />
      <MainCost role="Onduleurs" quantity={sizing?.inverter.count ?? 0} total={result?.lines.find((line) => line.key === 'inverters')?.totalSale ?? null} unitPrice={effective.inverterUnitPrice} margin={effective.inverterMargin} onPrice={set('inverterUnitPrice')} onMargin={set('inverterMargin')} />
    </div></section>
    <section><div className="tbl-title"><h2 className="h-sec">{t('costing.other')}</h2><span className="sep" /><span className="label">{costing.definedCostForAccessories ? 'en valeur' : 'en % du matériel principal'}</span><button className="btn" disabled={mainCost <= 0} onClick={toggleAccessoryMode}>{t('costing.toggle')}</button></div><div className="acclist">
      {ACCESSORIES.map((accessory) => { const priceKey = `${accessory.key}Price` as keyof typeof costing; const marginKey = `${accessory.key}Margin` as keyof typeof costing; return <div className="accitem" key={accessory.key}><span className="accitem-lbl">{accessory.label}</span><div className="accitem-pair"><div className="accrow-fld"><NumField label="" unit={costing.definedCostForAccessories ? 'FCFA' : '%'} value={costing[priceKey] as number} onChange={set(priceKey)} decimals={costing.definedCostForAccessories ? 0 : 1} /></div><div className="accrow-fld accrow-fld-m"><NumField label="" unit="%" value={costing[marginKey] as number} onChange={set(marginKey)} decimals={1} /></div></div></div>; })}
    </div></section>
    <section className={'out ' + (result ? '' : 'is-stale')}><div className="out-head"><span className="out-tag">{result ? 'calculé' : 'en attente'}</span><h2 className="h-sec">{t('costing.salePrice')}</h2><span className="sep" /><button className="btn" disabled={!result} onClick={() => setShowDetail(true)}>Détail par poste</button></div><div className="out-grid finance-summary">{[
      ['Total TTC', result?.totalTtc, 'FCFA'], ['Vente HT', result?.totalSaleHt, 'FCFA'], ['Bénéfice', result?.profit, 'FCFA'], ['Marge bénéficiaire', result === null ? undefined : result.averageMarginRatio * 100, '%'], ['Prix du Wc', result?.wattPeakPrice, 'FCFA/Wc'], ['LCOE actualisé', result?.lifecycle.lcoeActualized, 'FCFA/kWh'],
    ].map(([label, value, unit]) => <div className={'out-cell ' + (value === undefined ? 'is-pending' : '')} key={label as string}><span className="out-lbl">{label}</span><span className="out-val"><b>{value === undefined ? '—' : fmt(value as number, unit === '%' ? 1 : 0)}</b>{value !== undefined && <span className="unit">{unit}</span>}</span></div>)}</div>{result && <div className="out-foot"><span className="out-foot-say">Le cycle de vie additionne investissement, entretien et remplacements futurs, actualisés sur {project.assumptions.projectLifetime} ans.</span><button className="btn" onClick={() => setShowLife(true)}>Voir le détail du cycle de vie</button></div>}</section>
    {result && presizing && sizing && <section className="finance-comparison"><div className="out-head"><span className="out-tag">simulé</span><h2 className="h-sec">Comparaison du système retenu</h2><span className="sep" /><span className="badge ok">valeurs réelles recalculées</span></div><div className="tbl-wrap"><table className="tbl finance-compare-table"><thead><tr><th>Grandeur</th><th>Prédimensionné</th><th>Système retenu</th><th>Écart</th></tr></thead><tbody>{[
      ['Puissance crête', presizing.pvPeakKw, sizing.pv.obtainedPowerKwc, 'kWc', false],
      ['Stockage utile', presizing.storageKwh, sizing.battery.usefulEnergyKwh, 'kWh', false],
      ['Onduleur', presizing.inverterKw, sizing.inverter.obtainedPowerKw, 'kW', false],
      ['Production annuelle', presizing.annualProductionKwh, result.simulation.annualProductionKwh, 'kWh/an', false],
      ['LPSP', presizing.lpsp * 100, result.simulation.lpsp * 100, '%', true],
      ['LOLP', presizing.lolp * 100, result.simulation.lolp * 100, '%', true],
      ['SRI', presizing.sri, result.simulation.sri, '', false],
      ['LCOE actualisé', presizing.lcoe, result.lifecycle.lcoeActualized, 'FCFA/kWh', true],
      ['SVI', presizing.svi, result.lifecycle.svi, '', true],
    ].map(([label, before, after, unit, lower]) => { const delta = percentDelta(before as number, after as number); return <tr key={label as string}><td>{label}</td><td className="num muted-value">{fmt(before as number, unit === '%' ? 1 : unit === '' ? 3 : 1)} <span className="unit">{unit}</span></td><td className="num"><b>{fmt(after as number, unit === '%' ? 1 : unit === '' ? 3 : 1)}</b> <span className="unit">{unit}</span></td><td className={'num delta-value ' + deltaClass(delta, lower as boolean)}>{delta === null ? '—' : `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 1)} %`}</td></tr>; })}</tbody></table></div></section>}
    {showDetail && result && <Dialog title="Détail par poste" lead={result.lines.length + ' postes · prix de revient et vente'} wide onClose={() => setShowDetail(false)}><div className="tbl-wrap"><table className="tbl"><thead><tr><th>Poste</th><th>Qté</th><th>Revient unit.</th><th>Marge</th><th>Total revient</th><th>Total vente</th></tr></thead><tbody>{result.lines.map((line) => <tr key={line.key}><td>{line.label}</td><td className="num">{fmt(line.quantity)}</td><td className="num">{fmt(line.unitCost)}</td><td className="num">{fmt(line.marginRatio * 100, 1)} %</td><td className="num">{fmt(line.totalCost)}</td><td className="num">{fmt(line.totalSale)}</td></tr>)}</tbody><tfoot><tr><td colSpan={4}>Vente HT</td><td className="num">{fmt(result.totalCost)}</td><td className="num">{fmt(result.totalSaleHt)}</td></tr><tr><td colSpan={5}>Total TTC</td><td className="num"><b>{fmt(result.totalTtc)}</b></td></tr></tfoot></table></div></Dialog>}
    {showLife && result && <Dialog title={'Cycle de vie sur ' + project.assumptions.projectLifetime + ' ans'} lead={'système réellement retenu · actualisé à ' + fmt(project.assumptions.actualizationRate, 1) + ' %'} wide onClose={() => setShowLife(false)}><div className="kpis" style={{ marginBottom: 0 }}><div className="kpi kpi-head"><span className="h-sec">Dépenses actualisées</span></div><div className="kpi"><span>Investissement initial TTC</span><span><b>{fmt(result.totalTtc)}</b><span className="unit">FCFA</span></span></div><div className="kpi"><span>Entretien annuel</span><span><b>{fmt(result.lifecycle.annualMaintenanceCost)}</b><span className="unit">FCFA/an</span></span></div><div className="kpi"><span>Remplacements actualisés</span><span><b>{fmt(result.lifecycle.actualizedReplacementCost)}</b><span className="unit">FCFA</span></span></div><div className="kpi kpi-head"><span className="h-sec">Performance réelle</span></div><div className="kpi"><span>LCOE actualisé</span><span><b>{fmt(result.lifecycle.lcoeActualized)}</b><span className="unit">FCFA/kWh</span>{presizing && <span className="delta">prédimensionné {fmt(presizing.lcoe)}</span>}</span></div><div className="kpi"><span>SVI · rapport au tarif réseau</span><span><b>{fmt(result.lifecycle.svi, 2)}</b>{presizing && <span className="delta">prédimensionné {fmt(presizing.svi, 2)}</span>}</span></div><div className="kpi"><span>Énergie servie annuelle</span><span><b>{fmt(result.simulation.servedEnergyKwh)}</b><span className="unit">kWh/an</span></span></div><div className="kpi kpi-head"><span className="h-sec">Impact évité</span></div><div className="kpi"><span>Groupe électrogène comparable</span><span><b>{fmt(result.lifecycle.dieselEquivalentInvestment)}</b><span className="unit">FCFA</span><span className="delta">investissement seul, hors carburant et entretien</span></span></div><div className="kpi"><span>CO₂ évité</span><span><b>{fmt(result.lifecycle.co2AvoidedKg)}</b><span className="unit">kg</span></span></div><div className="kpi"><span>Équivalent arbres</span><span><b>{fmt(result.lifecycle.co2AvoidedTrees)}</b></span></div></div></Dialog>}
    {showTerms && <Dialog title="Conditions commerciales" lead="taxes, remise et engagements de l’offre" wide onClose={() => setShowTerms(false)} footer={<button className="btn-primary" onClick={() => setShowTerms(false)}>{t('g.close')}</button>}><div className="form-rows">
      <NumField label="TVA" unit="%" value={costing.tvaPercent} onChange={set('tvaPercent')} decimals={1} />
      <NumField label="Remise" unit="%" value={costing.reductionPercent} onChange={set('reductionPercent')} decimals={1} />
      <NumField label="Acompte à la commande" unit="%" value={costing.downPaymentPercent} onChange={set('downPaymentPercent')} decimals={1} />
      <NumField label="Délai de livraison" unit="jours" value={costing.deliveryTime} onChange={set('deliveryTime')} />
      <NumField label="Validité de l’offre" unit="jours" value={costing.offerValidity} onChange={set('offerValidity')} />
      <NumField label="Garantie" unit="mois" value={costing.productWarranty} onChange={set('productWarranty')} />
    </div></Dialog>}
  </div>;
}
