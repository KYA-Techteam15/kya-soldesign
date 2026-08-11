import { useEffect, useMemo, useState } from 'react';
import type { Locality, WeatherSource } from '@ksd/domain';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { ErrorState } from '../../../shared/status/ErrorState.js';
import { Provenance } from '../../../shared/status/Provenance.js';
import { Field } from '../../../shared/ui/Field.js';
import { Flow } from '../../../shared/ui/Flow.js';
import type { WorkshopStepProps } from './stepProps.js';

export function SiteStep({ project }: WorkshopStepProps) {
  const { services, updateProject } = useApplication();
  const t = useT();
  const [localities, setLocalities] = useState<readonly Locality[]>([]);
  const [sources, setSources] = useState<readonly WeatherSource[]>([]);
  const [localityId, setLocalityId] = useState(typeof project.inputs['localityId'] === 'string' ? project.inputs['localityId'] : '');
  const [weatherSourceId, setWeatherSourceId] = useState(typeof project.inputs['weatherSourceId'] === 'string' ? project.inputs['weatherSourceId'] : '');
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    void services.catalog.listLocalities().then((records) => { if (active) { setLocalities(records); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [revision, services]);
  useEffect(() => {
    let active = true;
    if (!localityId) { setSources([]); return undefined; }
    void services.catalog.listWeatherSources(localityId).then((records) => { if (active) { setSources(records); setFailed(false); } }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [localityId, services]);

  const selectedLocality = useMemo(() => localities.find((item) => item.id === localityId), [localities, localityId]);
  const selectedSource = useMemo(() => sources.find((item) => item.id === weatherSourceId), [sources, weatherSourceId]);
  const save = () => {
    if (!selectedLocality || !selectedSource) return;
    updateProject({ ...project, updatedAt: new Date().toISOString(), inputs: { ...project.inputs, localityId: selectedLocality.id, weatherSourceId: selectedSource.id } });
  };
  if (failed) return <ErrorState title={t('catalog.error')}><p>{t('error.retryHelp')}</p><button className="button button-secondary" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></ErrorState>;
  return <section className="work-card"><h2>{t('workshop.site')}</h2><p>{t('workshop.inputsOnly')}</p><Flow>
    <Field label={t('workshop.location')}><select className="select" value={localityId} onChange={(event) => { setLocalityId(event.target.value); setWeatherSourceId(''); }}><option value="">{t('workshop.selectLocality')}</option>{localities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.countryCode}</option>)}</select></Field>
    {selectedLocality ? <Provenance sourceId={selectedLocality.provenance.sourceId} /> : null}
    <Field label={t('workshop.weather')}><select className="select" value={weatherSourceId} disabled={!localityId || sources.length === 0} onChange={(event) => setWeatherSourceId(event.target.value)}><option value="">{sources.length === 0 && localityId ? t('workshop.noWeather') : t('workshop.selectWeather')}</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.sourceName} · {item.provider}</option>)}</select></Field>
    {selectedSource ? <Provenance sourceId={selectedSource.provenance.sourceId} /> : null}
    <button className="button button-primary" disabled={!selectedLocality || !selectedSource} onClick={save}>{t('workshop.save')}</button>
  </Flow></section>;
}
