import { useMemo, useState } from 'react';
import { loadItemSchema, type LoadItem } from '@ksd/domain';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { Flow } from '../../../shared/ui/Flow.js';
import { TextField } from '../../../shared/ui/Field.js';
import { parseLoadDraft } from './loadDraft.js';
import type { WorkshopStepProps } from './stepProps.js';

function storedLoad(value: unknown): LoadItem | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const parsed = loadItemSchema.safeParse(value[0]);
  return parsed.success ? parsed.data : null;
}

export function NeedsStep({ project }: WorkshopStepProps) {
  const { updateProject } = useApplication();
  const t = useT();
  const existing = useMemo(() => storedLoad(project.inputs['loads']), [project.inputs]);
  const [label, setLabel] = useState(existing?.label ?? '');
  const [quantity, setQuantity] = useState(existing ? String(existing.quantity) : '');
  const [activePowerW, setActivePowerW] = useState(existing ? String(existing.activePowerW) : '');
  const [powerFactor, setPowerFactor] = useState(existing?.powerFactor === null || existing === null ? '' : String(existing.powerFactor));
  const [simultaneityRatio, setSimultaneityRatio] = useState(existing ? String(existing.simultaneityRatio) : '');
  const [activeHours, setActiveHours] = useState<readonly number[]>(existing ? existing.hourlyOperatingFractions.flatMap((value, hour) => value > 0 ? [hour] : []) : []);
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const toggleHour = (hour: number) => setActiveHours((current) => current.includes(hour) ? current.filter((item) => item !== hour) : [...current, hour].sort((left, right) => left - right));
  const save = () => {
    const result = parseLoadDraft({ id: existing?.id ?? `load-${crypto.randomUUID()}`, label, quantity, activePowerW, powerFactor, simultaneityRatio, activeHours });
    if (!result.ok) { setErrors(result.fieldErrors); return; }
    setErrors({});
    updateProject({ ...project, updatedAt: new Date().toISOString(), inputs: { ...project.inputs, loads: [result.item] } });
  };
  const errorFor = (field: string) => errors[field] ? t('validation.invalid') : undefined;
  return <section className="work-card"><h2>{t('workshop.needs')}</h2><p>{t('workshop.inputsOnly')}</p><Flow>
    <div className="field-grid load-grid"><TextField label={t('workshop.loadName')} value={label} maxLength={100} error={errorFor('label')} onChange={(event) => setLabel(event.target.value)} /><TextField label={t('workshop.power')} inputMode="decimal" value={activePowerW} error={errorFor('activePowerW')} onChange={(event) => setActivePowerW(event.target.value)} /><TextField label={t('workshop.quantity')} inputMode="numeric" value={quantity} error={errorFor('quantity')} onChange={(event) => setQuantity(event.target.value)} /><TextField label={t('workshop.powerFactor')} inputMode="decimal" value={powerFactor} error={errorFor('powerFactor')} onChange={(event) => setPowerFactor(event.target.value)} /><TextField label={t('workshop.simultaneity')} inputMode="decimal" value={simultaneityRatio} error={errorFor('simultaneityRatio')} onChange={(event) => setSimultaneityRatio(event.target.value)} /></div>
    <fieldset className="hour-fieldset"><legend>{t('workshop.hours')}</legend><p>{t('workshop.hoursHelp')}</p><div className="hour-grid">{Array.from({ length: 24 }, (_, hour) => <button type="button" key={hour} className={activeHours.includes(hour) ? 'hour-button active' : 'hour-button'} aria-pressed={activeHours.includes(hour)} onClick={() => toggleHour(hour)}>{String(hour).padStart(2, '0')}h</button>)}</div></fieldset>
    <button className="button button-primary" onClick={save}>{t('workshop.save')}</button>
  </Flow></section>;
}
