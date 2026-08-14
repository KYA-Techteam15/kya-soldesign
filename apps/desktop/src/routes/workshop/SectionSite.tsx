import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { useCatalog } from '../../app/CatalogProvider';
import { countryName } from '../../app/models/catalogView';
import { fmt } from '../../domain/format';
import { Group, NumField, ReadField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { useT } from '../../i18n';

const MONTHS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

export function SectionSite() {
  const t = useT();
  const project = useProject();
  const update = useProjects((state) => state.update);
  const lang = useUi((state) => state.lang);
  const { localities, weatherSources } = useCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const site = project.site;
  const source = weatherSources.find((item) => item.id === site.weatherSourceId) ?? null;
  const linkedSources = weatherSources.filter((item) => item.localityId === site.localityId);
  const resourceComplete = site.downloadedSource !== null
    && site.downloadedSource.name.trim().length > 0
    && site.downloadedSource.versionOrDate.trim().length > 0
    && site.downloadedSource.locator.trim().length > 0
    && site.downloadedSource.retrievedAtIso.length > 0;
  const resourceFresh = resourceComplete && site.irradiationBasis?.tilt === site.tilt && site.irradiationBasis.azimuth === site.azimuth;
  const selectedIrradiation = site.designMonth === null ? null : site.monthlyIrradiation[site.designMonth - 1] ?? null;
  const hits = localities.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);

  return <div className="sheet">
    <StepHead slug="site" aside={<span className="label">{localities.length} localités · {weatherSources.length} sources météo canoniques</span>} />
    <div className="form-grid">
      <Group title="Coordonnées">
        <label><span>{t('site.locality')}</span><button className="pickfield" onClick={() => setOpen(true)}><b>{site.region || 'Choisir une localité…'}</b><small>{site.country || '—'}</small></button></label>
        <ReadField label="Pays" value={site.country || '—'} />
        <ReadField label="Latitude" value={site.localityId ? fmt(site.latitude, 4) : '—'} unit={site.localityId ? '°' : undefined} />
        <ReadField label="Longitude" value={site.localityId ? fmt(site.longitude, 4) : '—'} unit={site.localityId ? '°' : undefined} />
      </Group>
      <Group title="Orientation du champ">
        <NumField label="Inclinaison" unit="°" value={site.tilt} onChange={(value) => update((draft) => { draft.site.tilt = value; })} decimals={1} />
        <NumField label="Azimut" unit="°" value={site.azimuth} onChange={(value) => update((draft) => { draft.site.azimuth = value; })} decimals={1} />
        <label><span>{t('site.timezone')}</span><input placeholder="Africa/Lome" value={site.timezoneIana ?? ''} onChange={(event) => update((draft) => { draft.site.timezoneIana = event.target.value || null; })} /></label>
        <label><span>{t('site.designMonth')}</span><select value={site.designMonth ?? ''} onChange={(event) => update((draft) => { draft.site.designMonth = event.target.value === '' ? null : Number(event.target.value); })}><option value="">{t('site.choose')}</option>{MONTHS.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select></label>
        <ReadField label="Irradiation de conception" value={resourceFresh && selectedIrradiation !== null ? fmt(selectedIrradiation, 2) : '—'} unit={resourceFresh && selectedIrradiation !== null ? 'kWh/m²/j' : undefined} note={site.downloadedSource === null ? 'ressource non renseignée' : !resourceComplete ? 'source à documenter complètement' : !resourceFresh ? 'ressource périmée après changement d’orientation' : selectedIrradiation === null ? 'mois critique ou irradiation manquante' : 'mois critique et orientation courante'} />
      </Group>
    </div>
    <section><div className="tbl-title"><h2 className="h-sec">{t('site.weatherSource')}</h2><span className="label">{source ? `${source.sourceName} · ${source.provider}` : site.localityId ? 'aucune source liée à cette localité' : 'aucune localité choisie'}</span><span className="sep" /><select aria-label="Source météo" value={site.weatherSourceId ?? ''} disabled={linkedSources.length === 0} onChange={(event) => { const next = weatherSources.find((item) => item.id === event.target.value) ?? null; update((draft) => { draft.site.weatherSourceId = next?.id ?? null; draft.site.downloadedSource = next === null ? null : { name: next.sourceName, provider: next.provider, versionOrDate: '', locator: '', retrievedAtIso: '', qualityFlags: ['user-declared-monthly-poa'] }; draft.site.monthlyIrradiation = Array.from({ length: 12 }, () => null); draft.site.irradiationBasis = next === null ? null : { tilt: draft.site.tilt, azimuth: draft.site.azimuth }; }); }}><option value="">{t('site.chooseSource')}</option>{linkedSources.map((item) => <option key={item.id} value={item.id}>{item.sourceName} · {item.provider}</option>)}</select></div>{source !== null && site.downloadedSource !== null && <div className="form-rows"><label><span>{t('site.dataset')}</span><input value={site.downloadedSource.name} onChange={(event) => update((draft) => { if (draft.site.downloadedSource) draft.site.downloadedSource.name = event.target.value; })} /></label><label><span>{t('site.versionPeriod')}</span><input placeholder="ex. TMY 2005–2020" value={site.downloadedSource.versionOrDate} onChange={(event) => update((draft) => { if (draft.site.downloadedSource) draft.site.downloadedSource.versionOrDate = event.target.value; })} /></label><label><span>{t('site.reference')}</span><input placeholder="URL, fichier ou identifiant" value={site.downloadedSource.locator} onChange={(event) => update((draft) => { if (draft.site.downloadedSource) draft.site.downloadedSource.locator = event.target.value; })} /></label><label><span>{t('site.retrievedAt')}</span><input type="datetime-local" value={site.downloadedSource.retrievedAtIso ? site.downloadedSource.retrievedAtIso.slice(0, 16) : ''} onChange={(event) => update((draft) => { if (draft.site.downloadedSource) draft.site.downloadedSource.retrievedAtIso = event.target.value ? new Date(event.target.value).toISOString() : ''; })} /></label></div>}</section>
    <div className="chart-duo">
      <section><div className="tbl-title"><h2 className="h-sec">{t('site.monthlyIrradiation')}</h2><span className="label">kWh/m²/jour en plan des modules</span></div><div className="month-grid">{MONTHS.map((month, index) => <label key={month}><span>{month}</span><input inputMode="decimal" aria-label={`Irradiation ${month}`} disabled={site.downloadedSource === null} value={site.monthlyIrradiation[index] ?? ''} onChange={(event) => { const parsed = Number.parseFloat(event.target.value.replace(',', '.')); update((draft) => { draft.site.monthlyIrradiation[index] = Number.isFinite(parsed) ? parsed : null; draft.site.irradiationBasis = { tilt: draft.site.tilt, azimuth: draft.site.azimuth }; const known = draft.site.monthlyIrradiation.filter((value): value is number => value !== null); draft.site.irradiation = known.length === 0 ? 0 : known.reduce((sum, value) => sum + value, 0) / known.length; }); }} /></label>)}</div>{site.downloadedSource === null && <div className="empty" style={{ marginTop: 'var(--sp-3)' }}><b>{t('site.noWeatherSeries')}</b>Choisissez une source puis reportez les valeurs d’un document ou jeu de données identifiable. Aucune valeur n’est fabriquée.</div>}</section>
      <section><div className="tbl-title"><h2 className="h-sec">{t('site.resourceEvidence')}</h2><span className={`badge ${resourceFresh ? 'ok' : ''}`}>{resourceFresh ? 'preuve complète et alignée' : 'incomplète ou périmée'}</span></div><div className="tbl-wrap" style={{ padding: 'var(--sp-3)' }}><div className="prov-grid"><span>{t('site.source')}</span><b>{source?.sourceName ?? '—'}</b><span>{t('site.orientation')}</span><b>{site.irradiationBasis ? `${fmt(site.irradiationBasis.tilt, 1)}° / ${fmt(site.irradiationBasis.azimuth, 1)}°` : '—'}</b><span>{t('site.period')}</span><b>{site.downloadedSource?.versionOrDate || '—'}</b><span>{t('site.reference')}</span><b>{site.downloadedSource?.locator || '—'}</b></div></div></section>
    </div>
    {open && <Dialog title="Localité du site" lead="coordonnées et source météo suivent le choix" wide onClose={() => setOpen(false)}>
      <input className="dlg-search" autoFocus placeholder="Rechercher une ville…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="proj-list" style={{ marginTop: 'var(--sp-3)' }}>{hits.map((locality) => {
        const weather = weatherSources.find((item) => item.localityId === locality.id) ?? null;
        return <button key={locality.id} className="proj-row" onClick={() => { update((draft) => { draft.site.localityId = locality.id; draft.site.region = locality.name; draft.site.countryCode = locality.countryCode; draft.site.country = countryName(locality.countryCode, lang); draft.site.latitude = locality.latitudeDeg; draft.site.longitude = locality.longitudeDeg; draft.site.weatherSourceId = weather?.id ?? null; draft.site.timezoneIana = locality.timezone; draft.site.designMonth = null; draft.site.tilt = weather?.defaultTiltDeg ?? 0; draft.site.azimuth = weather?.defaultAzimuthDeg ?? 0; draft.site.monthlyIrradiation = Array.from({ length: 12 }, () => null); draft.site.irradiation = 0; draft.site.irradiationBasis = weather === null ? null : { tilt: weather.defaultTiltDeg ?? 0, azimuth: weather.defaultAzimuthDeg ?? 0 }; draft.site.downloadedSource = weather === null ? null : { name: weather.sourceName, provider: weather.provider, versionOrDate: '', locator: '', retrievedAtIso: '', qualityFlags: ['user-declared-monthly-poa'] }; }); setQuery(''); setOpen(false); }}><span><b>{locality.name}</b><small>{countryName(locality.countryCode, lang)}</small></span><span className="when">{fmt(locality.latitudeDeg, 4)}</span><span className="when">{fmt(locality.longitudeDeg, 4)}</span><span className={`badge ${weather ? 'ok' : ''}`}>{weather ? 'source liée' : 'sans source'}</span></button>;
      })}{hits.length === 0 && <div className="empty" style={{ margin: 0 }}><b>{t('site.noLocality')}</b></div>}</div>
    </Dialog>}
  </div>;
}
