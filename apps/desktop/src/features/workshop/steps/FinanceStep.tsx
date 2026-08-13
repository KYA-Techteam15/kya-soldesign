import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function FinanceStep({ project }: WorkshopStepProps) {
  const v = useValidatedCopy();
  return <UnavailableCapability projectId={project.id} capability="finance" titleKey="workshop.finance"><div className="form-stack">
    <section><h2 className="h-sec">{v('commercialSettings')}</h2><div className="form-rows"><label><span>{v('currency')}</span><select><option>{'FCFA (XOF)'}</option></select></label><label><span>{v('vat')}</span><span className="uf"><input inputMode="decimal" /><span className="uf-unit">{'%'}</span></span></label><label><span>{v('targetMargin')}</span><span className="uf"><input inputMode="decimal" /><span className="uf-unit">{'%'}</span></span></label></div></section>
    <section className="out is-stale"><div className="out-head"><span className="out-tag">{v('waiting')}</span><h2 className="h-sec">{v('commercialSummary')}</h2></div><div className="out-grid">{[v('materialCost'), v('installationCost'), v('salePriceExclTax'), v('vat'), v('salePriceInclTax'), v('margin')].map((label) => <div className="out-cell is-pending" key={label}><span className="out-lbl">{label}</span><span className="out-val"><b>—</b></span></div>)}</div></section>
  </div></UnavailableCapability>;
}
