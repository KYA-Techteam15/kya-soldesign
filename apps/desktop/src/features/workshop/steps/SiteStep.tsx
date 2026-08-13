import { useEffect, useMemo, useState } from 'react';
import type { Locality, WeatherSource } from '@ksd/domain';
import { useApplication } from '../../../app/ApplicationProvider.js';
import { useT } from '../../../shared/i18n/index.js';
import { useValidatedCopy } from '../../../shared/i18n/useValidatedCopy.js';
import type { WorkshopStepProps } from './stepProps.js';

export function SiteStep({ project }: WorkshopStepProps) {
  const { services, updateProject } = useApplication();
  const t = useT();
  const v = useValidatedCopy();
  const [localities, setLocalities] = useState<readonly Locality[]>([]);
  const [sources, setSources] = useState<readonly WeatherSource[]>([]);
  const [localityId, setLocalityId] = useState(typeof project.inputs['localityId'] === 'string' ? project.inputs['localityId'] : '');
  const [weatherSourceId, setWeatherSourceId] = useState(typeof project.inputs['weatherSourceId'] === 'string' ? project.inputs['weatherSourceId'] : '');
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => { let active = true; void services.catalog.listLocalities().then((records) => { if (active) { setLocalities(records); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [revision, services]);
  useEffect(() => { let active = true; if (!localityId) { setSources([]); return undefined; } void services.catalog.listWeatherSources(localityId).then((records) => { if (active) { setSources(records); setFailed(false); } }).catch(() => { if (active) setFailed(true); }); return () => { active = false; }; }, [localityId, services]);
  const selectedLocality = useMemo(() => localities.find((item) => item.id === localityId), [localities, localityId]);
  const selectedSource = useMemo(() => sources.find((item) => item.id === weatherSourceId), [sources, weatherSourceId]);
  const save = () => { if (!selectedLocality || !selectedSource) return; updateProject({ ...project, updatedAt: new Date().toISOString(), inputs: { ...project.inputs, localityId: selectedLocality.id, weatherSourceId: selectedSource.id } }); };
  if (failed) return <div className="stub" role="alert"><b>{t('catalog.error')}</b><span>{t('error.retryHelp')}</span><button className="btn" onClick={() => setRevision((value) => value + 1)}>{t('action.retry')}</button></div>;
  return <div className="form-stack">
    <section><div className="rowline"><h2 className="h-sec">{v('localityWeather')}</h2><span className="sep" /><span className="label">{t('catalog.provenance')}</span></div><div className="form-rows"><label><span>{t('workshop.location')}</span><select value={localityId} onChange={(event) => { setLocalityId(event.target.value); setWeatherSourceId(''); }}><option value="">{t('workshop.selectLocality')}</option>{localities.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.countryCode}</option>)}</select></label><label><span>{t('workshop.weather')}</span><select value={weatherSourceId} disabled={!localityId || sources.length === 0} onChange={(event) => setWeatherSourceId(event.target.value)}><option value="">{sources.length === 0 && localityId ? t('workshop.noWeather') : t('workshop.selectWeather')}</option>{sources.map((item) => <option key={item.id} value={item.id}>{item.sourceName} · {item.provider}</option>)}</select></label><div className="ro-field"><span className="ro-lbl">{v('source')}</span><span className="ro-box"><span className="ro-val"><b>{selectedSource?.provenance.sourceId ?? '—'}</b></span></span></div></div></section>
    <section><h2 className="h-sec">{v('arrayOrientation')}</h2><div className="form-rows"><label><span>{v('tilt')}</span><span className="uf"><input inputMode="decimal" /><span className="uf-unit">°</span></span></label><label><span>{v('azimuth')}</span><span className="uf"><input inputMode="decimal" /><span className="uf-unit">°</span></span></label><div className="ro-field"><span className="ro-lbl">{v('coordinates')}</span><span className="ro-box"><span className="ro-val"><b>{selectedLocality ? `${selectedLocality.latitudeDeg.toFixed(3)}, ${selectedLocality.longitudeDeg.toFixed(3)}` : '—'}</b></span></span></div></div></section>
    <div className="rowline"><span className="label">{t('workshop.inputsOnly')}</span><span className="sep" /><button className="btn btn-ok btn-field" disabled={!selectedLocality || !selectedSource} onClick={save}>{t('workshop.save')}</button></div>
  </div>;
}
