import { useState } from 'react';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function DossierStep({ project }: WorkshopStepProps) {
  const t = useT();
  const [tab, setTab] = useState('verification');
  const tabs = [{ id: 'verification', label: t('workshop.verification') }, { id: 'synoptic', label: t('workshop.synoptic') }, { id: 'documents', label: t('workshop.documents') }];
  return <UnavailableCapability projectId={project.id} capability="dossier" titleKey="workshop.dossier"><div className="form-stack">
    <div className="seg" role="tablist">{tabs.map((item) => <button id={`tab-${item.id}`} key={item.id} role="tab" aria-selected={tab === item.id} aria-controls={`panel-${item.id}`} onClick={() => setTab(item.id)}>{item.label}</button>)}</div>
    <section id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="dossier-panel">{tab === 'verification' ? <Verification /> : tab === 'synoptic' ? <Synoptic /> : <Documents />}</section>
  </div></UnavailableCapability>;
}

function Verification() { const v = useValidatedCopy(); const t = useT(); return <div className="form-grid"><div className="kpis"><div className="kpi kpi-head"><span className="h-sec">{v('dossierCompleteness')}</span></div>{[t('workshop.project'), t('workshop.site'), t('workshop.needs'), t('workshop.presizing'), t('workshop.equipment'), t('workshop.protections'), t('workshop.finance')].map((label) => <div className="kpi" key={label}><span>{label}</span><span className="badge warn">{v('toComplete')}</span></div>)}</div><div className="stub"><b>{v('dossierBlocked')}</b><p>{v('dossierBlockedHelp')}</p><span className="tag">{'DOC-001'}</span></div></div>; }
function Synoptic() { const v = useValidatedCopy(); return <div className="synoptic-empty truth-panel"><h2 className="h-sec">{v('synopticView')}</h2><p>{v('synopticHelp')}</p></div>; }
function Documents() { const v = useValidatedCopy(); return <div className="tbl-wrap"><table className="tbl"><thead><tr><th>{v('document')}</th><th>{v('state')}</th><th>{v('action')}</th></tr></thead><tbody>{[v('technicalSummary'), v('sizingReport'), v('singleLine'), v('financialOffer')].map((label) => <tr key={label}><td>{label}</td><td><span className="badge warn">{v('unavailable')}</span></td><td><button className="btn" disabled>{v('generate')}</button></td></tr>)}</tbody></table></div>; }
