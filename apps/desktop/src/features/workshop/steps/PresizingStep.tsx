import { useState } from 'react';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function PresizingStep({ project }: WorkshopStepProps) {
  const t = useT();
  const v = useValidatedCopy();
  const [lpsp, setLpsp] = useState('');
  const [lolp, setLolp] = useState('');
  const [tariff, setTariff] = useState('');
  return <UnavailableCapability projectId={project.id} capability="presizing" titleKey="workshop.presizing">
    <div className="form-stack">
      <section><h2 className="h-sec">{v('studyCriteria')}</h2><div className="form-rows"><label><span>{v('maxLpsp')}</span><span className="uf"><input inputMode="decimal" value={lpsp} onChange={(event) => setLpsp(event.target.value)} /><span className="uf-unit">{'%'}</span></span></label><label><span>{v('maxLolp')}</span><span className="uf"><input inputMode="decimal" value={lolp} onChange={(event) => setLolp(event.target.value)} /><span className="uf-unit">{'%'}</span></span></label><label><span>{v('gridTariff')}</span><span className="uf"><input inputMode="decimal" value={tariff} onChange={(event) => setTariff(event.target.value)} /><span className="uf-unit">{'FCFA/kWh'}</span></span></label></div></section>
      <div className="runbar is-stale"><button className="btn btn-ok btn-run" disabled>{v('runPresizing')}</button><span className="runbar-note">{v('noFormula')}</span></div>
      <section className="out is-stale"><div className="out-head"><span className="out-tag">{v('waiting')}</span><h2 className="h-sec">{v('minimumSystem')}</h2></div><div className="out-grid"><PendingOutput label={v('pvPeak')} /><PendingOutput label={v('inverterMinimum')} /><PendingOutput label={v('storageMinimum')} /><PendingOutput label={v('annualProduction')} /></div></section>
      <section className="out is-stale"><div className="out-head"><span className="out-tag">{v('waiting')}</span><h2 className="h-sec">{v('reliabilityEconomy')}</h2></div><div className="out-grid"><PendingOutput label="LPSP" /><PendingOutput label="LOLP" /><PendingOutput label="SRI" /><PendingOutput label={v('producedKwhCost')} /><PendingOutput label="SVI" /></div></section>
      <p className="label">{t('workshop.unavailableDetail')}</p>
    </div>
  </UnavailableCapability>;
}

function PendingOutput({ label }: { readonly label: string }) { return <div className="out-cell is-pending"><span className="out-lbl">{label}</span><span className="out-val"><b>—</b></span></div>; }
