import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { convertReferenceCost } from '@ksd/engine';
import type { ProjectViewModel } from '../../app/models/projectView';
import { NumField } from '../../ui/Field';
import { fmt } from '../../domain/format';
import { useT } from '../../i18n';

type Assumptions = ProjectViewModel['assumptions'];
type CostFamily = 'pv' | 'storage' | 'inverter';
type CostMode = 'specific' | 'component';

export function EconomicAssumptionsPanel({ assumptions, currency, onSet, onSetMode, onApplyReference }: {
  readonly assumptions: Assumptions;
  /** Devise du dossier : les coûts spécifiques s'expriment dans celle-ci. */
  readonly currency: string;
  readonly onSet: (key: 'pvSpecificCost' | 'pvMargin' | 'batterySpecificCost' | 'batteryMargin' | 'inverterSpecificCost' | 'inverterMargin' | 'lcoeGrid' | 'emissionFactor', value: number) => void;
  readonly onSetMode: (family: CostFamily, mode: CostMode) => void;
  readonly onApplyReference: (family: CostFamily, price: number, size: number, specificCost: number) => void;
}) {
  const t = useT();
  return <div className="economic-assumptions">
    <CostGroup currency={currency} title={t('presizing.costs.pv')} mode={assumptions.pvCostInputMode} specificCost={assumptions.pvSpecificCost} margin={assumptions.pvMargin} referencePrice={assumptions.pvReferencePrice} referenceSize={assumptions.pvReferencePowerW} sizeLabel={t('presizing.costs.panelPower')} sizeUnit="Wc" divisor={1000} specificUnit={`${currency}/kWc`} onMode={(mode) => onSetMode('pv', mode)} onSpecific={(value) => onSet('pvSpecificCost', value)} onMargin={(value) => onSet('pvMargin', value)} onApply={(price, size, cost) => onApplyReference('pv', price, size, cost)} />
    <CostGroup currency={currency} title={t('presizing.costs.storage')} mode={assumptions.storageCostInputMode} specificCost={assumptions.batterySpecificCost} margin={assumptions.batteryMargin} referencePrice={assumptions.storageReferencePrice} referenceSize={assumptions.storageReferenceKwh} sizeLabel={t('presizing.costs.referenceStorage')} sizeUnit="kWh" divisor={1} specificUnit={`${currency}/kWh`} onMode={(mode) => onSetMode('storage', mode)} onSpecific={(value) => onSet('batterySpecificCost', value)} onMargin={(value) => onSet('batteryMargin', value)} onApply={(price, size, cost) => onApplyReference('storage', price, size, cost)} />
    <CostGroup currency={currency} title={t('presizing.costs.inverter')} mode={assumptions.inverterCostInputMode} specificCost={assumptions.inverterSpecificCost} margin={assumptions.inverterMargin} referencePrice={assumptions.inverterReferencePrice} referenceSize={assumptions.inverterReferencePowerW} sizeLabel={t('presizing.costs.inverterPower')} sizeUnit="W" divisor={1000} specificUnit={`${currency}/kW`} onMode={(mode) => onSetMode('inverter', mode)} onSpecific={(value) => onSet('inverterSpecificCost', value)} onMargin={(value) => onSet('inverterMargin', value)} onApply={(price, size, cost) => onApplyReference('inverter', price, size, cost)} />
    <EconomicGroup title={t('presizing.costs.environment')} method={t('presizing.costs.environmentMethod')}><div className="form-rows economic-fields"><NumField label={t('presizing.costs.gridTariff')} unit={`${currency}/kWh`} value={assumptions.lcoeGrid} onChange={(value) => onSet('lcoeGrid', value)} /><NumField label={t('presizing.costs.emissionFactor')} unit="kgCO₂/kWh" value={assumptions.emissionFactor} onChange={(value) => onSet('emissionFactor', value)} decimals={2} /></div></EconomicGroup>
  </div>;
}

function CostGroup({ title, mode, specificCost, margin, referencePrice, referenceSize, sizeLabel, sizeUnit, divisor, specificUnit, currency, onMode, onSpecific, onMargin, onApply }: {
  readonly currency: string; readonly title: string; readonly mode: CostMode; readonly specificCost: number; readonly margin: number; readonly referencePrice: number | null; readonly referenceSize: number | null; readonly sizeLabel: string; readonly sizeUnit: string; readonly divisor: number; readonly specificUnit: string; readonly onMode: (mode: CostMode) => void; readonly onSpecific: (value: number) => void; readonly onMargin: (value: number) => void; readonly onApply: (price: number, size: number, cost: number) => void;
}) {
  const t = useT();
  const [price, setPrice] = useState(referencePrice ?? 0);
  const [size, setSize] = useState(referenceSize ?? 0);
  useEffect(() => { setPrice(referencePrice ?? 0); setSize(referenceSize ?? 0); }, [referencePrice, referenceSize]);
  const conversion = useMemo(() => convertReferenceCost({ totalPriceMinor: price, referenceSize: size / divisor }), [divisor, price, size]);
  const preview = conversion.status === 'available' ? conversion.specificCostMinorPerKwh : null;
  const coefficient = (mode === 'component' && preview !== null ? preview : specificCost) * (1 + margin / 100);
  return <EconomicGroup title={title} method={mode === 'specific' ? t('presizing.costs.specificMethod') : t('presizing.costs.componentMethod')}>
    <div className="seg economic-methods" role="tablist" aria-label={`${title} · ${t('presizing.costs.entryMethod')}`}><button type="button" role="tab" aria-selected={mode === 'specific'} onClick={() => onMode('specific')}>{t('presizing.costs.specificTab')}</button><button type="button" role="tab" aria-selected={mode === 'component'} onClick={() => onMode('component')}>{t('presizing.costs.componentTab')}</button></div>
    {mode === 'specific' ? <div className="form-rows economic-fields"><NumField label={t('presizing.costs.specificCost')} unit={specificUnit} value={specificCost} onChange={onSpecific} /><NumField label={t('presizing.costs.commercialMargin')} unit="%" value={margin} onChange={onMargin} decimals={1} /></div> : <><div className="form-rows economic-fields"><NumField label={sizeLabel} unit={sizeUnit} value={size} onChange={setSize} decimals={sizeUnit === 'kWh' ? 2 : 0} /><NumField label={t('presizing.costs.componentPrice')} unit={currency} value={price} onChange={setPrice} /><NumField label={t('presizing.costs.commercialMargin')} unit="%" value={margin} onChange={onMargin} decimals={1} /></div><div className="economic-conversion" role="status"><span>{t('presizing.costs.calculatedSpecific')}</span><b>{preview === null ? '—' : fmt(preview)} <span className="unit">{specificUnit}</span></b><small>{preview === null ? t('presizing.costs.referenceRequired') : `${fmt(price)} ÷ ${fmt(size / divisor, divisor === 1 ? 2 : 3)} = ${fmt(preview)}`}</small><button type="button" className="btn btn-ok" disabled={preview === null} onClick={() => { if (preview !== null) onApply(price, size, preview); }}>{t('presizing.costs.applyCalculated')}</button></div></>}
    <div className="economic-coefficient"><span>{t('presizing.costs.withMargin')}</span><b>{fmt(coefficient)} <span className="unit">{specificUnit}</span></b></div>
  </EconomicGroup>;
}

function EconomicGroup({ title, method, children }: { readonly title: string; readonly method: string; readonly children: ReactNode }) { return <section className="economic-group"><header><h3>{title}</h3><span>{method}</span></header><div className="economic-group-body">{children}</div></section>; }
