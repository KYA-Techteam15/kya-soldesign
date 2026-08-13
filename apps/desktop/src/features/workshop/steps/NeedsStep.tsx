import { useMemo, useState } from 'react';
import { loadItemSchema, type LoadItem } from '@ksd/domain';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import { parseLoadDraft } from './loadDraft.js';
import type { WorkshopStepProps } from './stepProps.js';

function storedLoad(value: unknown): LoadItem | null { if (!Array.isArray(value) || value.length === 0) return null; const parsed = loadItemSchema.safeParse(value[0]); return parsed.success ? parsed.data : null; }

export function NeedsStep({ project }: WorkshopStepProps) {
  const { updateProject } = useApplication();
  const t = useT();
  const v = useValidatedCopy();
  const existing = useMemo(() => storedLoad(project.inputs['loads']), [project.inputs]);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '');
  const [activePowerW, setActivePowerW] = useState(existing ? String(existing.activePowerW) : '');
  const [powerFactor, setPowerFactor] = useState(existing?.powerFactor === null || existing === null ? '' : String(existing.powerFactor));
  const [simultaneityRatio, setSimultaneityRatio] = useState(existing ? String(existing.simultaneityRatio) : '');
  const [activeHours, setActiveHours] = useState<readonly number[]>(existing ? existing.hourlyOperatingFractions.flatMap((value, hour) => value > 0 ? [hour] : []) : []);
  const [invalid, setInvalid] = useState(false);
  const toggleHour = (hour: number) => setActiveHours((current) => current.includes(hour) ? current.filter((item) => item !== hour) : [...current, hour].sort((left, right) => left - right));
  const save = () => { const result = parseLoadDraft({ id: existing?.id ?? `load-${crypto.randomUUID()}`, label, quantity, activePowerW, powerFactor, simultaneityRatio, activeHours }); if (!result.ok) { setInvalid(true); return; } setInvalid(false); updateProject({ ...project, updatedAt: new Date().toISOString(), inputs: { ...project.inputs, loads: [result.item] } }); };
  return <div className="form-stack">
    <section><div className="tbl-title"><h2 className="h-sec">{v('classicLoads')}</h2><span className="label">{existing ? '1' : v('newRow')}</span><span className="sep" /><span className="label">{v('calculatedColumns')}</span></div><div className="tbl-wrap"><table className="tbl t-classic"><thead><tr><th>{v('name')}</th><th>{v('quantityShort')}</th><th>{v('unitPower')}<span className="unit">{'W'}</span></th><th>{v('yieldShort')}</th><th>{v('hours')}</th><th className="derived">{v('totalPower')}<span className="unit">{'W'}</span></th><th className="derived">{v('realPower')}<span className="unit">{'W'}</span></th><th className="derived">{v('energy')}</th><th /></tr></thead><tbody><tr className={invalid ? 'row-err' : undefined}><td className="name"><input className="cell-in" aria-label={t('workshop.loadName')} value={label} onChange={(event) => setLabel(event.target.value)} /></td><td><input className="cell-in" aria-label={t('workshop.quantity')} inputMode="numeric" value={quantity} onChange={(event) => setQuantity(event.target.value)} /></td><td><input className="cell-in" aria-label={t('workshop.power')} inputMode="decimal" value={activePowerW} onChange={(event) => setActivePowerW(event.target.value)} /></td><td><input className="cell-in" aria-label={t('workshop.powerFactor')} inputMode="decimal" value={powerFactor} onChange={(event) => setPowerFactor(event.target.value)} /></td><td><input className="cell-in" aria-label={t('workshop.simultaneity')} inputMode="decimal" value={simultaneityRatio} onChange={(event) => setSimultaneityRatio(event.target.value)} /></td><td className="derived num">—</td><td className="derived num">—</td><td className="derived num">—</td><td /></tr></tbody></table><div className="addrow"><button className="btn">{v('addRow')}</button><span className="sep" /><span>{t('workshop.inputsOnly')}</span></div></div></section>
    <section><div className="tbl-title"><h2 className="h-sec">{v('hourlyProfile')}</h2><span className="label">{t('workshop.hoursHelp')}</span></div><div className="hourgrid">{Array.from({ length: 24 }, (_, hour) => <div key={hour}><span>{String(hour).padStart(2, '0')}h</span><button type="button" className="cell-in" aria-label={`${String(hour).padStart(2, '0')}h`} aria-pressed={activeHours.includes(hour)} onClick={() => toggleHour(hour)}>{activeHours.includes(hour) ? '1' : '0'}</button></div>)}</div></section>
    <section><div className="tbl-title"><h2 className="h-sec">{v('inductiveLoads')}</h2><span className="label">{v('startingCoefficientHelp')}</span></div><div className="tbl-wrap"><table className="tbl t-induct"><thead><tr><th>{v('name')}</th><th>{v('quantityShort')}</th><th>{v('unitPower')}<span className="unit">{'W'}</span></th><th>{v('yieldShort')}</th><th>{v('startingCoefficient')}</th><th>{v('hours')}</th><th className="derived">{v('totalPower')}</th><th className="derived">{v('realPower')}</th><th className="derived">{v('peak')}</th><th /></tr></thead><tbody><tr><td className="name"><span className="label">{v('noRow')}</span></td><td /><td /><td /><td /><td /><td className="derived">—</td><td className="derived">—</td><td className="derived">—</td><td /></tr></tbody></table></div></section>
    <div className="rowline"><span className="label">{invalid ? t('validation.invalid') : t('workshop.inputsOnly')}</span><span className="sep" /><button className="btn btn-ok btn-field" onClick={save}>{t('workshop.save')}</button></div>
  </div>;
}
