import { useState } from 'react';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { Flow } from '../../../shared/ui/Flow.js';
import { TextField } from '../../../shared/ui/Field.js';
import type { WorkshopStepProps } from './stepProps.js';

export function ProjectStep({ project }: WorkshopStepProps) {
  const { updateProject } = useApplication();
  const t = useT();
  const [name, setName] = useState(project.name);
  const save = () => updateProject({ ...project, name: name.trim() || project.name, updatedAt: new Date().toISOString() });
  return <section className="work-card"><h2>{t('workshop.project')}</h2><p>{t('workshop.inputsOnly')}</p><Flow><TextField label={t('workshop.projectName')} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /><button className="button button-primary" onClick={save}>{t('workshop.save')}</button></Flow></section>;
}
