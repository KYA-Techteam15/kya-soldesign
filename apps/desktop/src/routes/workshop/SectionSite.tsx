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

export function SectionSite() {
  const project = useProject();
  const update = useProjects((state) => state.update);
  const lang = useUi((state) => state.lang);
  const { localities, weatherSources } = useCatalog();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const site = project.site;
  const source = weatherSources.find((item) => item.id === site.weatherSourceId) ?? null;
  const hits = localities.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12);

  return <div className="sheet">
    <StepHead slug="site" aside={<span className="label">{localities.length} localités · {weatherSources.length} sources météo canoniques</span>} />
    <div className="form-grid">
      <Group title="Coordonnées">
        <label><span>Localité</span><button className="pickfield" onClick={() => setOpen(true)}><b>{site.region || 'Choisir une localité…'}</b><small>{site.country || '—'}</small></button></label>
        <ReadField label="Pays" value={site.country || '—'} />
        <ReadField label="Latitude" value={site.localityId ? fmt(site.latitude, 4) : '—'} unit={site.localityId ? '°' : undefined} />
        <ReadField label="Longitude" value={site.localityId ? fmt(site.longitude, 4) : '—'} unit={site.localityId ? '°' : undefined} />
      </Group>
      <Group title="Orientation du champ">
        <NumField label="Inclinaison" unit="°" value={site.tilt} onChange={(value) => update((draft) => { draft.site.tilt = value; })} decimals={1} />
        <NumField label="Azimut" unit="°" value={site.azimuth} onChange={(value) => update((draft) => { draft.site.azimuth = value; })} decimals={1} />
        <ReadField label="Irradiation moyenne" value="—" note="série horaire non chargée" />
      </Group>
    </div>
    <section><div className="tbl-title"><h2 className="h-sec">Source météo</h2><span className="label">{source ? `${source.sourceName} · ${source.provider}` : site.localityId ? 'aucune source liée à cette localité' : 'aucune localité choisie'}</span></div></section>
    <div className="chart-duo">
      <section><div className="tbl-title"><h2 className="h-sec">Irradiation mensuelle</h2><span className="label">kWh/m²/jour en plan des modules</span></div><div className="tbl-wrap" style={{ padding: 'var(--sp-3)' }}><div className="empty" style={{ margin: 0 }}><b>Aucune série météo chargée</b>Les métadonnées canoniques identifient la source, mais ne contiennent pas de valeurs horaires. Aucun profil n’est fabriqué.</div></div></section>
      <section><div className="tbl-title"><h2 className="h-sec">Journée moyenne</h2><span className="label">W/m² en plan des modules</span></div><div className="tbl-wrap" style={{ padding: 'var(--sp-3)' }}><div className="empty" style={{ margin: 0 }}><b>Pas encore de journée type</b>Elle sera produite à partir d’une vraie série météo par une capacité dédiée.</div></div></section>
    </div>
    {open && <Dialog title="Localité du site" lead="coordonnées et source météo suivent le choix" wide onClose={() => setOpen(false)}>
      <input className="dlg-search" autoFocus placeholder="Rechercher une ville…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="proj-list" style={{ marginTop: 'var(--sp-3)' }}>{hits.map((locality) => {
        const weather = weatherSources.find((item) => item.localityId === locality.id) ?? null;
        return <button key={locality.id} className="proj-row" onClick={() => { update((draft) => { draft.site.localityId = locality.id; draft.site.region = locality.name; draft.site.countryCode = locality.countryCode; draft.site.country = countryName(locality.countryCode, lang); draft.site.latitude = locality.latitudeDeg; draft.site.longitude = locality.longitudeDeg; draft.site.weatherSourceId = weather?.id ?? null; draft.site.tilt = weather?.defaultTiltDeg ?? 0; draft.site.azimuth = weather?.defaultAzimuthDeg ?? 0; draft.site.monthlyIrradiation = Array.from<number>({ length: 12 }).fill(0); draft.site.irradiation = 0; draft.site.irradiationBasis = null; draft.site.downloadedSource = null; }); setQuery(''); setOpen(false); }}><span><b>{locality.name}</b><small>{countryName(locality.countryCode, lang)}</small></span><span className="when">{fmt(locality.latitudeDeg, 4)}</span><span className="when">{fmt(locality.longitudeDeg, 4)}</span><span className={`badge ${weather ? 'ok' : ''}`}>{weather ? 'source liée' : 'sans source'}</span></button>;
      })}{hits.length === 0 && <div className="empty" style={{ margin: 0 }}><b>Aucune localité ne correspond</b></div>}</div>
    </Dialog>}
  </div>;
}
