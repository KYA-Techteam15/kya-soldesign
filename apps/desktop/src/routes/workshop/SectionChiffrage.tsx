import { useState } from 'react';
import type { FinanceOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { DecimalField } from '../../ui/Field';
import { DecimalInput } from '../../ui/DecimalInput';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useCalculationState } from '../../app/CalculationProvider';
import { useCalculationFacts } from '../../app/calculation/useCalculationFacts';
import { effectiveMainLines, marginsFollowAssumptions, type MainLineCost } from '../../app/models/costingModel';
import type { ProjectViewModel } from '../../app/models/projectView';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { useT } from '../../i18n';
import { useUi } from '../../store/ui';
import { currencyLabel, fmt } from '../../domain/format';

const ACCESSORIES = ['cabling', 'electricalBox', 'supports', 'transport', 'installation'] as const;
type Costing = ProjectViewModel['costing'];
type MainKey = 'module' | 'battery' | 'inverter';
const MAIN: readonly { readonly key: MainKey; readonly label: string; readonly marginKey: 'pvMargin' | 'batteryMargin' | 'inverterMargin' }[] = [
  { key: 'module', label: 'costing.line.modules', marginKey: 'pvMargin' },
  { key: 'battery', label: 'costing.line.batteries', marginKey: 'batteryMargin' },
  { key: 'inverter', label: 'costing.line.inverters', marginKey: 'inverterMargin' },
];

const percentDelta = (before: number, after: number) => before === 0 ? null : (after / before - 1) * 100;
const deltaClass = (delta: number | null, lowerIsBetter = false) => delta === null || Math.abs(delta) < 0.05 ? '' : (lowerIsBetter ? delta < 0 : delta > 0) ? 'good' : 'bad';

export function SectionChiffrage() {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const project = useProject();
  const update = useProjects((state) => state.update);
  const costing = project.costing;
  const money = currencyLabel(project.currency, lang);
  const { sizing, presizing: presizingOutput } = useCalculationFacts(project);
  const state = useCalculationState<FinanceOutputV1>(project.id, 'finance', project.updatedAt);
  const result = state.status === 'ready' ? state.envelope.output : null;
  const presizing = presizingOutput?.selected ?? null;
  const [dialog, setDialog] = useState<'terms' | 'detail' | 'life' | null>(null);

  const a = project.assumptions;
  const effective = effectiveMainLines<MainKey>({
    module: { unitPrice: costing.moduleUnitPrice, marginRatio: costing.moduleMargin / 100, specificCost: a.pvSpecificCost, assumptionMarginRatio: a.pvMargin / 100, unitSize: sizing ? sizing.pv.obtainedPowerKwc / Math.max(sizing.pv.totalModules, 1) : null },
    battery: { unitPrice: costing.batteryUnitPrice, marginRatio: costing.batteryMargin / 100, specificCost: a.batterySpecificCost, assumptionMarginRatio: a.batteryMargin / 100, unitSize: sizing ? sizing.battery.obtainedEnergyKwh / Math.max(sizing.battery.totalUnits, 1) : null },
    inverter: { unitPrice: costing.inverterUnitPrice, marginRatio: costing.inverterMargin / 100, specificCost: a.inverterSpecificCost, assumptionMarginRatio: a.inverterMargin / 100, unitSize: sizing ? sizing.inverter.obtainedPowerKw / Math.max(sizing.inverter.count, 1) : null },
  });
  const quantities: Record<MainKey, number> = { module: sizing?.pv.totalModules ?? 0, battery: sizing?.battery.totalUnits ?? 0, inverter: sizing?.inverter.count ?? 0 };
  const lineKey: Record<MainKey, string> = { module: 'modules', battery: 'batteries', inverter: 'inverters' };
  const mainCost = result?.lines.filter((line) => ['modules', 'batteries', 'inverters'].includes(line.key)).reduce((sum, line) => sum + line.totalCost, 0) ?? 0;

  const set = (key: keyof Costing) => (value: number) => update((draft) => { (draft.costing[key] as number) = value; });
  /** Première marge saisie : les deux autres quittent les hypothèses avec leur valeur actuelle. */
  const setMargin = (key: MainKey, value: number) => update((draft) => {
    if (marginsFollowAssumptions([{ unitPrice: draft.costing.moduleUnitPrice, marginRatio: draft.costing.moduleMargin }, { unitPrice: draft.costing.batteryUnitPrice, marginRatio: draft.costing.batteryMargin }, { unitPrice: draft.costing.inverterUnitPrice, marginRatio: draft.costing.inverterMargin }])) {
      draft.costing.moduleMargin = draft.assumptions.pvMargin;
      draft.costing.batteryMargin = draft.assumptions.batteryMargin;
      draft.costing.inverterMargin = draft.assumptions.inverterMargin;
    }
    draft.costing[`${key}Margin`] = value;
  });
  const toggleAccessoryMode = () => update((draft) => {
    if (mainCost <= 0) return;
    for (const accessory of ACCESSORIES) {
      const priceKey = `${accessory}Price` as const;
      const value = draft.costing[priceKey];
      draft.costing[priceKey] = draft.costing.definedCostForAccessories ? value / mainCost * 100 : Math.round(value / 100 * mainCost);
    }
    draft.costing.definedCostForAccessories = !draft.costing.definedCostForAccessories;
  });

  return (
    <div className="sheet">
      <StepHead slug="chiffrage" aside={<button className="btn" onClick={() => setDialog('terms')}>{t('costing.terms')}</button>} />
      <section className="targets">
        <span className="targets-tag">{t('costing.quantities')}</span>
        {MAIN.map((line) => (
          <div className="tgt" key={line.key}><span className="tgt-lbl">{t(line.label)}</span><span className="tgt-val"><b>{fmt(quantities[line.key])}</b><span className="unit">u</span></span></div>
        ))}
        <span className="sep" />
        <span className={`tgt-got ${sizing ? 'ok' : ''}`}>{sizing ? t('costing.fromSizing') : t('costing.sizingRequired')}</span>
      </section>
      {state.status !== 'ready' && <CapabilityNotice capability="finance" state={state} compact />}

      <section>
        <div className="tbl-title"><h2 className="h-sec">{t('costing.mainEquipment')}</h2><span className="sep" /><span className="label">{t('costing.unitPrices')}</span></div>
        {/* Un tableau par nature de poste, mêmes colonnes : l'unité est dans l'en-tête, les champs
            s'alignent et chaque ligne donne son total de vente. */}
        <div className="tbl-wrap">
          <table className="tbl cost-table">
            <thead>
              <tr>
                <th>{t('costing.col.item')}</th>
                <th className="num">{t('costing.col.qty')}</th>
                <th className="num">{t('costing.unitCost')} <span className="unit">{money}</span></th>
                <th className="num">{t('costing.margin')} <span className="unit">%</span></th>
                <th className="num">{t('costing.saleTotal')} <span className="unit">{money}</span></th>
              </tr>
            </thead>
            <tbody>
              {MAIN.map((line) => (
                <MainCost
                  key={line.key}
                  role={t(line.label)}
                  quantity={quantities[line.key]}
                  cost={effective[line.key]}
                  total={result?.lines.find((item) => item.key === lineKey[line.key])?.totalSale ?? null}
                  onPrice={set(`${line.key}UnitPrice`)}
                  onReset={() => set(`${line.key}UnitPrice`)(0)}
                  onMargin={(value) => setMargin(line.key, value)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">{t('costing.other')}</h2><span className="sep" />
          <span className="label">{costing.definedCostForAccessories ? t('costing.asAmount') : t('costing.asPercent')}</span>
          <button className="btn" disabled={mainCost <= 0} onClick={toggleAccessoryMode}>
            {costing.definedCostForAccessories ? t('costing.switchToPercent') : t('costing.switchToAmount').replace('{currency}', money)}
          </button>
        </div>
        <div className="tbl-wrap">
          <table className="tbl cost-table">
            <thead>
              <tr>
                <th>{t('costing.col.item')}</th>
                <th className="num">{costing.definedCostForAccessories ? <>{t('costing.amount')} <span className="unit">{money}</span></> : t('costing.shareOfMain')}</th>
                <th className="num">{t('costing.margin')} <span className="unit">%</span></th>
                <th className="num">{t('costing.saleTotal')} <span className="unit">{money}</span></th>
              </tr>
            </thead>
            <tbody>
              {ACCESSORIES.map((accessory) => {
                const total = result?.lines.find((item) => item.key === accessory)?.totalSale;
                return (
                  <tr key={accessory}>
                    <td className="cost-role">{t(`costing.line.${accessory}`)}</td>
                    <td className="cost-in"><DecimalInput className="cell-in" aria-label={t(`costing.line.${accessory}`)} value={costing[`${accessory}Price`]} decimals={costing.definedCostForAccessories ? 0 : 1} min={0} onCommit={(value) => { if (value !== null) set(`${accessory}Price`)(value); }} /></td>
                    <td className="cost-in"><DecimalInput className="cell-in" aria-label={`${t('costing.margin')} · ${t(`costing.line.${accessory}`)}`} value={costing[`${accessory}Margin`]} decimals={1} min={0} max={100} onCommit={(value) => { if (value !== null) set(`${accessory}Margin`)(value); }} /></td>
                    <td className="num cost-total">{total === undefined ? '—' : fmt(total)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className={`out ${result ? '' : 'is-stale'}`}>
        <div className="out-head">
          <span className="out-tag">{result ? t('costing.calculated') : t('costing.pending')}</span>
          <h2 className="h-sec">{t('costing.salePrice')}</h2><span className="sep" />
          <button className="btn" disabled={!result} onClick={() => setDialog('detail')}>{t('costing.detail')}</button>
        </div>
        <div className="out-grid finance-summary">
          {([
            ['costing.totalTtc', result?.totalTtc, money, 0], ['costing.saleHt', result?.totalSaleHt, money, 0], ['costing.profit', result?.profit, money, 0],
            ['costing.marginRate', result === null ? undefined : result.averageMarginRatio * 100, '%', 1], ['costing.wattPeakPrice', result?.wattPeakPrice, `${money}/Wc`, 0], ['costing.lcoe', result?.lifecycle.lcoeActualized, `${money}/kWh`, 1],
          ] as const).map(([label, value, unit, decimals]) => (
            <div className={`out-cell ${value === undefined ? 'is-pending' : ''}`} key={label}>
              <span className="out-lbl">{t(label)}</span>
              <span className="out-val"><b>{value === undefined ? '—' : fmt(value, decimals)}</b>{value !== undefined && <span className="unit">{unit}</span>}</span>
            </div>
          ))}
        </div>
        {result && <div className="out-foot"><span className="out-foot-say">{t('costing.lifecycleSay').replace('{years}', String(a.projectLifetime))}</span><button className="btn" onClick={() => setDialog('life')}>{t('costing.lifecycleDetail')}</button></div>}
      </section>

      {result && presizing && sizing && <Comparison presizing={presizing} sizing={sizing} result={result} money={money} />}

      {dialog === 'detail' && result && (
        <Dialog title={t('costing.detail')} lead={`${result.lines.length} ${t('costing.detailLead')}`} wide onClose={() => setDialog(null)}>
          <div className="tbl-wrap"><table className="tbl">
            <thead><tr><th>{t('costing.col.item')}</th><th>{t('costing.col.qty')}</th><th>{t('costing.col.unitCost')}</th><th>{t('costing.margin')}</th><th>{t('costing.col.totalCost')}</th><th>{t('costing.col.totalSale')}</th></tr></thead>
            <tbody>{result.lines.map((line) => <tr key={line.key}><td>{t(`costing.line.${line.key}`)}</td><td className="num">{fmt(line.quantity)}</td><td className="num">{fmt(line.unitCost)}</td><td className="num">{fmt(line.marginRatio * 100, 1)} %</td><td className="num">{fmt(line.totalCost)}</td><td className="num">{fmt(line.totalSale)}</td></tr>)}</tbody>
            <tfoot>
              <tr><td colSpan={4}>{t('costing.subtotal')}</td><td className="num">{fmt(result.totalCost)}</td><td className="num">{fmt(result.grossSaleHt)}</td></tr>
              {result.discount > 0 && <tr><td colSpan={5}>{t('costing.discount')}</td><td className="num">−{fmt(result.discount)}</td></tr>}
              <tr><td colSpan={5}>{t('costing.saleHt')}</td><td className="num">{fmt(result.totalSaleHt)}</td></tr>
              <tr><td colSpan={5}>{t('costing.vat')} {fmt(costing.tvaPercent, 1)} %</td><td className="num">{fmt(result.vatAmount)}</td></tr>
              <tr><td colSpan={5}>{t('costing.totalTtc')}</td><td className="num"><b>{fmt(result.totalTtc)}</b></td></tr>
            </tfoot>
          </table></div>
        </Dialog>
      )}

      {dialog === 'life' && result && (
        <Dialog title={t('costing.lifecycleTitle').replace('{years}', String(a.projectLifetime))} lead={t('costing.lifecycleLead').replace('{rate}', fmt(a.actualizationRate, 1))} wide onClose={() => setDialog(null)}>
          <div className="kpis kpis-flush">
            <div className="kpi kpi-head"><span className="h-sec">{t('costing.life.spending')}</span></div>
            <Kpi label={t('costing.life.investment')} value={fmt(result.totalTtc)} unit={money} />
            <Kpi label={t('costing.life.maintenance')} value={fmt(result.lifecycle.annualMaintenanceCost)} unit={`${money}/${t('unit.year')}`} />
            <Kpi label={t('costing.life.replacements')} value={fmt(result.lifecycle.actualizedReplacementCost)} unit={money} />
            <div className="kpi kpi-head"><span className="h-sec">{t('costing.life.performance')}</span></div>
            <Kpi label={t('costing.lcoe')} value={fmt(result.lifecycle.lcoeActualized, 1)} unit={`${money}/kWh`} delta={presizing ? `${t('costing.presized')} ${fmt(presizing.lcoe, 1)}` : undefined} />
            <Kpi label={t('costing.life.svi')} value={fmt(result.lifecycle.svi, 2)} delta={presizing ? `${t('costing.presized')} ${fmt(presizing.svi, 2)}` : undefined} />
            <Kpi label={t('costing.life.served')} value={fmt(result.simulation.servedEnergyKwh)} unit={`kWh/${t('unit.year')}`} />
            <div className="kpi kpi-head"><span className="h-sec">{t('costing.life.avoided')}</span></div>
            <Kpi label={t('costing.life.diesel')} value={fmt(result.lifecycle.dieselEquivalentInvestment)} unit={money} delta={t('costing.life.dieselNote')} />
            <Kpi label={t('costing.life.co2')} value={fmt(result.lifecycle.co2AvoidedKg / 1000, 1)} unit="t" />
            <Kpi label={t('costing.life.trees')} value={fmt(result.lifecycle.co2AvoidedTrees)} delta={t('costing.life.treesNote')} />
          </div>
        </Dialog>
      )}

      {dialog === 'terms' && (
        <Dialog title={t('costing.terms')} lead={t('costing.termsLead')} wide onClose={() => setDialog(null)} footer={<button className="btn btn-primary" onClick={() => setDialog(null)}>{t('g.close')}</button>}>
          <div className="form-rows">
            <DecimalField label={t('costing.vat')} unit="%" value={costing.tvaPercent} onCommit={set('tvaPercent')} decimals={1} min={0} max={100} />
            <DecimalField label={t('costing.discount')} unit="%" value={costing.reductionPercent} onCommit={set('reductionPercent')} decimals={1} min={0} max={100} />
            <DecimalField label={t('costing.downPayment')} unit="%" value={costing.downPaymentPercent} onCommit={set('downPaymentPercent')} decimals={1} min={0} max={100} />
            <DecimalField label={t('costing.delivery')} unit={t('settings.days')} value={costing.deliveryTime} onCommit={set('deliveryTime')} min={0} />
            <DecimalField label={t('costing.validity')} unit={t('settings.days')} value={costing.offerValidity} onCommit={set('offerValidity')} min={0} />
            <DecimalField label={t('costing.warranty')} unit={t('settings.months')} value={costing.productWarranty} onCommit={set('productWarranty')} min={0} />
          </div>
        </Dialog>
      )}
    </div>
  );
}

function MainCost({ role, quantity, cost, total, onPrice, onReset, onMargin }: {
  readonly role: string; readonly quantity: number; readonly cost: MainLineCost; readonly total: number | null;
  readonly onPrice: (value: number) => void; readonly onReset: () => void; readonly onMargin: (value: number) => void;
}) {
  const t = useT();
  return (
    <tr>
      <td className="cost-role">{role}</td>
      <td className="num">{fmt(quantity)}</td>
      <td className="cost-in">
        <DecimalInput className="cell-in" aria-label={`${t('costing.unitCost')} · ${role}`} value={cost.unitPrice} decimals={0} min={0} onCommit={(value) => { if (value !== null) onPrice(value); }} />
        <small className="cost-note">{cost.priceSource === 'auto' ? t('costing.priceAuto') : <>{t('costing.priceManual')} · <button type="button" className="linkish" onClick={onReset}>{t('costing.priceReset')}</button></>}</small>
      </td>
      <td className="cost-in"><DecimalInput className="cell-in" aria-label={`${t('costing.margin')} · ${role}`} value={Math.round(cost.marginRatio * 1000) / 10} decimals={1} min={0} max={100} onCommit={(value) => { if (value !== null) onMargin(value); }} /></td>
      <td className="num cost-total">{total === null ? '—' : fmt(total)}</td>
    </tr>
  );
}

function Kpi({ label, value, unit, delta }: { readonly label: string; readonly value: string; readonly unit?: string; readonly delta?: string }) {
  return <div className="kpi"><span>{label}</span><span><b>{value}</b>{unit && <span className="unit">{unit}</span>}{delta && <span className="delta">{delta}</span>}</span></div>;
}

function Comparison({ presizing, sizing, result, money }: {
  readonly presizing: NonNullable<ReturnType<typeof useCalculationFacts>['presizing']>['selected'];
  readonly sizing: NonNullable<ReturnType<typeof useCalculationFacts>['sizing']>;
  readonly result: FinanceOutputV1;
  readonly money: string;
}) {
  const t = useT();
  const rows: readonly [string, number, number, string, boolean, number][] = [
    ['costing.cmp.peak', presizing.pvPeakKw, sizing.pv.obtainedPowerKwc, 'kWc', false, 2],
    ['costing.cmp.storage', presizing.storageKwh, sizing.battery.usefulEnergyKwh, 'kWh', false, 1],
    ['costing.cmp.inverter', presizing.inverterKw, sizing.inverter.obtainedPowerKw, 'kW', false, 1],
    ['costing.cmp.production', presizing.annualProductionKwh, result.simulation.annualProductionKwh, `kWh/${t('unit.year')}`, false, 0],
    ['LPSP', presizing.lpsp * 100, result.simulation.lpsp * 100, '%', true, 1],
    ['LOLP', presizing.lolp * 100, result.simulation.lolp * 100, '%', true, 1],
    ['SRI', presizing.sri, result.simulation.sri, '', false, 3],
    ['costing.lcoe', presizing.lcoe, result.lifecycle.lcoeActualized, `${money}/kWh`, true, 1],
    ['SVI', presizing.svi, result.lifecycle.svi, '', true, 2],
  ];
  return (
    <section className="finance-comparison">
      <div className="out-head"><span className="out-tag">{t('costing.simulated')}</span><h2 className="h-sec">{t('costing.comparison')}</h2><span className="sep" /><span className="label">{t('costing.comparisonLead')}</span></div>
      <div className="tbl-wrap"><table className="tbl finance-compare-table">
        <thead><tr><th>{t('costing.cmp.quantity')}</th><th>{t('costing.cmp.presized')}</th><th>{t('costing.cmp.retained')}</th><th>{t('costing.cmp.delta')}</th></tr></thead>
        <tbody>{rows.map(([label, before, after, unit, lower, decimals]) => {
          const delta = percentDelta(before, after);
          return <tr key={label}><td>{label.includes('.') ? t(label) : label}</td><td className="num muted-value">{fmt(before, decimals)} <span className="unit">{unit}</span></td><td className="num"><b>{fmt(after, decimals)}</b> <span className="unit">{unit}</span></td><td className={`num delta-value ${deltaClass(delta, lower)}`}>{delta === null ? '—' : `${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta), 1)} %`}</td></tr>;
        })}</tbody>
      </table></div>
    </section>
  );
}
