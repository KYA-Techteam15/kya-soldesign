import { useState } from 'react';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';

export function ProjectStep({ project }: WorkshopStepProps) {
  const { updateProject } = useApplication();
  const t = useT();
  const v = useValidatedCopy();
  const [name, setName] = useState(project.name);
  const [client, setClient] = useState(typeof project.inputs['clientName'] === 'string' ? project.inputs['clientName'] : '');
  const [number, setNumber] = useState(typeof project.inputs['projectNumber'] === 'string' ? project.inputs['projectNumber'] : '');
  const [location, setLocation] = useState(typeof project.inputs['projectLocation'] === 'string' ? project.inputs['projectLocation'] : '');
  const save = () => updateProject({ ...project, name: name.trim() || project.name, updatedAt: new Date().toISOString(), inputs: { ...project.inputs, clientName: client, projectNumber: number, projectLocation: location } });
  return <div className="form-stack">
    <section><h2 className="h-sec">{v('project')}</h2><div className="form-rows"><label><span>{t('workshop.projectName')}</span><input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} /></label><label><span>{v('projectNumber')}</span><input value={number} onChange={(event) => setNumber(event.target.value)} /></label><label><span>{v('projectLocation')}</span><input value={location} onChange={(event) => setLocation(event.target.value)} /></label></div></section>
    <section><h2 className="h-sec">{v('client')}</h2><div className="form-rows"><label><span>{v('clientName')}</span><input value={client} onChange={(event) => setClient(event.target.value)} /></label><label><span>{v('contact')}</span><input defaultValue="" /></label><label><span>{v('email')}</span><input type="email" defaultValue="" /></label></div></section>
    <div className="rowline"><span className="label">{t('workshop.inputsOnly')}</span><span className="sep" /><button className="btn btn-ok btn-field" onClick={save}>{t('workshop.save')}</button></div>
  </div>;
}
