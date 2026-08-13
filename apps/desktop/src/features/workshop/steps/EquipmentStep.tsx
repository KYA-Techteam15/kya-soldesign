import { useEffect, useState } from 'react';
import type { Equipment } from '@ksd/catalog';
import { Link } from 'react-router-dom';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';
import { UnavailableCapability } from './UnavailableCapability.js';

export function EquipmentStep({ project }: WorkshopStepProps) {
  const { services } = useApplication();
  const t = useT();
  const v = useValidatedCopy();
  const [items, setItems] = useState<readonly Equipment[]>([]);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; void services.catalog.list().then((records) => { if (active) { const oneOfEach = ['pv-module', 'battery', 'inverter'].flatMap((kind) => records.find((item) => item.kind === kind) ?? []); setItems(oneOfEach); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [revision, services]);
  return <UnavailableCapability projectId={project.id} capability="equipment-compatibility" titleKey="workshop.equipment">
    <div className="form-stack">
      <div className="rowline"><span className="label">{t('workshop.catalogPreviewHelp')}</span><span className="sep" /><Link className="btn" to="/catalogue">{t('workshop.catalogBrowse')}</Link></div>
      {failed ? <div className="stub" role="alert"><b>{t('catalog.error')}</b><button className="btn" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></div> : items.map((item) => <EquipmentBlock key={item.id} item={item} />)}
      <section><div className="tbl-title"><h2 className="h-sec">{v('presizedSelected')}</h2><span className="sep" /><span className="label">{v('pendingCalculations')}</span></div><div className="tbl-wrap"><table className="tbl t-cmp"><thead><tr><th>{v('quantity')}</th><th className="derived">{v('minimum')}</th><th>{v('selected')}</th><th className="derived">{v('difference')}</th></tr></thead><tbody>{[v('pvPower'), v('storage'), v('inverterPower')].map((label) => <tr key={label}><td>{label}</td><td className="derived num">—</td><td className="num">—</td><td className="derived num">—</td></tr>)}</tbody></table></div></section>
    </div>
  </UnavailableCapability>;
}

function EquipmentBlock({ item }: { readonly item: Equipment }) {
  const v = useValidatedCopy();
  const role = item.kind === 'pv-module' ? v('pvModule') : item.kind === 'battery' ? v('battery') : v('aioInverter');
  return <section className="eq"><div className="eq-head"><span className="role">{role}</span><span className="ref">{item.model}</span><span className="maker">{item.manufacturer}</span><span className="sep" /><span className="source-cue">{item.provenance.sourceId}</span><button className="btn">{v('change')}</button></div><div className="eq-body"><div className="eq-specs"><span className="spec"><span>{v('reference')}</span><b>{item.id.slice(0, 12)}</b></span><span className="spec"><span>{v('source')}</span><b>{item.provenance.sourceRecordId}</b></span></div><div className="eq-fit"><span className="label">{v('compatibilityLater')}</span></div></div></section>;
}
