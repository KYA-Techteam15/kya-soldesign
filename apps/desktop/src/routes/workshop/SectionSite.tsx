import { useMemo, useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { fmt } from '../../domain/format';
import { countryName, localities, weatherSources } from '../../data/reference';
import { Group, NumField, ReadField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { WeatherDownload } from './WeatherDownload';
import {
  annualMeanIrradiance,
  DAYS_IN_MONTH,
  fetchTmy,
  hourlyMeanIrradiance,
  optimalAzimuthFor,
  optimalTiltFor,
} from '../../domain/tmy';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export function SectionSite() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const lang = useUi((s) => s.lang);
  const [pickLocality, setPickLocality] = useState(false);
  const [q, setQ] = useState('');
  const [askDownload, setAskDownload] = useState(false);
  /* `-1` = année entière. C'est le profil que le moteur rend par défaut :
     `get_hourly_mean_irradiance` groupe les 8 760 pas sans filtrer de mois,
     et c'est lui qui sert de référence au γ. Le détail mensuel répond à la
     question suivante — quel mois dimensionne le stockage. */
  const [month, setMonth] = useState(-1);

  const s = project.site;
  const mi = s.monthlyIrradiation;
  const max = Math.max(...mi, 0.001);
  const sources = weatherSources.filter((w) => w.locality_id === s.localityId);
  const active = sources.find((w) => w.id === s.weatherSourceId) ?? null;
  /* Un seul fournisseur, donc une seule série par localité : la première
     trouvée EST la série du site. Faire choisir entre des objets identiques
     n'était qu'une question de plus. */
  const bound = active ?? sources[0] ?? null;

  /* Le profil est en plan des modules : tant que l'orientation n'a pas changé
     depuis le dernier calcul, l'irradiation affichée reste celle du site. */
  const basis = s.irradiationBasis;
  const loaded = mi.some((v) => v > 0);
  const stale = loaded && (!basis || basis.tilt !== s.tilt || basis.azimuth !== s.azimuth);
  /* Une localité téléchargée n'est pas forcément dans le référentiel embarqué :
     c'est le nom qui atteste qu'un site est posé, pas son identifiant en base. */
  const located = s.region.trim().length > 0;

  /* Profil journalier moyen, sous l'orientation courante. `get_hourly_mean_irradiance`
     groupe l'année type par heure ; c'est cette courbe, et non les douze
     mensuelles, qui montre l'effet d'un azimut. */
  const daily = useMemo(
    () =>
      month < 0
        ? annualMeanIrradiance(s.latitude, s.tilt, s.azimuth, mi)
        : hourlyMeanIrradiance(s.latitude, month, s.tilt, s.azimuth, mi[month] ?? 0),
    [s.latitude, month, s.tilt, s.azimuth, mi],
  );
  const dailyMax = Math.max(...daily, 1);
  const peakHour = daily.indexOf(Math.max(...daily));
  /* Le cumul du profil affiché, en kWh/m²/j : sur l'année il doit retomber
     sur la moyenne pondérée des douze mensuelles, ce qui rend les deux vues
     comparables au lieu de les laisser vivre chacune de son côté. */
  const dailyKwh = daily.reduce((a, b) => a + b, 0) / 1000;
  const annualKwh =
    mi.reduce((a, v, i) => a + v * DAYS_IN_MONTH[i], 0) /
    DAYS_IN_MONTH.reduce((a, b) => a + b, 0);

  const recompute = () => {
    update((p) => {
      p.site.irradiationBasis = { tilt: p.site.tilt, azimuth: p.site.azimuth };
      p.site.irradiation = p.site.monthlyIrradiation.reduce((a, b) => a + b, 0) / 12;
    });
    notify({
      kind: 'success',
      title: 'Profil recalculé',
      detail: `Irradiation en plan des modules sous ${fmt(s.tilt, 0)}° / ${fmt(s.azimuth, 0)}°.`,
    });
  };

  const needle = q.trim().toLowerCase();
  const hits = needle
    ? localities.filter((l) => l.name.toLowerCase().includes(needle)).slice(0, 8)
    : localities.slice(0, 8);


  return (
    <div className="sheet">
      <StepHead
        slug="site"
        aside={
          <span className="label">
            {localities.length} localités · {weatherSources.length} sources météo en base
          </span>
        }
      />

      <div className="form-grid">
        <Group title="Coordonnées">
          <label>
            <span>Localité</span>
            <button className="pickfield" onClick={() => setPickLocality(true)}>
              <b>{s.region || 'Choisir une localité…'}</b>
              <small>{s.country || '—'}</small>
            </button>
          </label>
          {/* Le pays et les coordonnées descendent de la localité : les
              présenter en saisie invitait à écrire une valeur que le prochain
              choix de localité écraserait sans prévenir. */}
          <ReadField
            label="Pays"
            value={s.country || '—'}
            prov={{
              title: 'Pays',
              rows: [
                ['Localité', s.region || '—'],
                ['Code pays', s.countryCode || '—'],
              ],
              source: 'déduit du code pays de la localité',
            }}
          />
          <ReadField
            label="Latitude"
            value={located ? fmt(s.latitude, 4) : '—'}
            unit={located ? '°' : undefined}
            prov={{
              title: 'Latitude',
              rows: [['Localité', s.region || '—']],
              source: 'coordonnées de la localité en base',
            }}
          />
          <ReadField
            label="Longitude"
            value={located ? fmt(s.longitude, 4) : '—'}
            unit={located ? '°' : undefined}
            prov={{
              title: 'Longitude',
              rows: [['Localité', s.region || '—']],
              source: 'coordonnées de la localité en base',
            }}
          />
        </Group>

        <Group title="Orientation du champ">
          {/* Chaque angle porte son propre calcul d'optimum, comme
              `optimal_tilt_button` et `optimal_azimuth_button`. Une case
              « Valeurs optimales » posée à côté ne disait plus quel angle
              elle allait changer, et en changeait deux. */}
          <NumField
            label="Inclinaison"
            unit="°"
            value={s.tilt}
            onChange={(v) => update((p) => { p.site.tilt = v; })}
            decimals={1}
            action={{
              icon: '✳',
              title: located
                ? `Inclinaison optimale pour ${fmt(s.latitude, 2)}° — formule β = 0,76 φ + 3,1`
                : 'Choisissez d’abord une localité',
              disabled: !located,
              onClick: () => {
                const t = optimalTiltFor(s.latitude);
                update((p) => { p.site.tilt = t; });
                notify({
                  kind: 'success',
                  title: `Inclinaison optimale : ${fmt(t, 0)}°`,
                  detail: 'β = 0,76 φ + 3,1, ramenée au pas de 5° du balayage.',
                });
              },
            }}
          />
          <NumField
            label="Azimut"
            unit="°"
            value={s.azimuth}
            onChange={(v) => update((p) => { p.site.azimuth = v; })}
            decimals={1}
            action={{
              icon: '✳',
              title: located
                ? 'Azimut optimal : plein sud au nord de l’équateur, plein nord au sud'
                : 'Choisissez d’abord une localité',
              disabled: !located,
              onClick: () => {
                const a = optimalAzimuthFor(s.latitude);
                update((p) => { p.site.azimuth = a; });
                notify({
                  kind: 'success',
                  title: `Azimut optimal : ${fmt(a, 0)}°`,
                  detail:
                    s.latitude > 0
                      ? 'Hémisphère nord — le champ regarde plein sud.'
                      : 'Hémisphère sud — le champ regarde plein nord.',
                });
              },
            }}
          />
          {/* L'irradiation n'est jamais saisie : elle est sommée depuis la
              série météo sous l'orientation courante. Sans série, « 0,00 » se
              lisait comme un site sans soleil. */}
          <ReadField
            label="Irradiation moyenne"
            value={loaded ? fmt(s.irradiation, 2) : '—'}
            unit={loaded ? 'kWh/m²/j' : undefined}
            stale={stale}
            note={
              !loaded
                ? 'aucune série chargée'
                : stale
                  ? `calculée sous ${fmt(basis?.tilt ?? 0, 0)}° / ${fmt(basis?.azimuth ?? 0, 0)}°`
                  : undefined
            }
            prov={{
              title: 'Irradiation moyenne',
              formula: 'moyenne des 12 mensuelles en plan des modules',
              rows: [
                ['Série météo', bound ? bound.source_name : s.downloadedSource?.name ?? 'aucune'],
                ['Inclinaison', `${fmt(basis?.tilt ?? s.tilt, 0)} °`],
                ['Azimut', `${fmt(basis?.azimuth ?? s.azimuth, 0)} °`],
              ],
              source: 'sommée depuis la série horaire, jamais saisie',
            }}
          />
        </Group>
      </div>

      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Source météo</h2>
          {/* La série suit la localité : elle se lit, elle ne se choisit plus.
              Un seul fournisseur et une série par lieu — le choix portait sur
              des objets indiscernables. */}
          <span className="label">
            {bound
              ? `${bound.source_name} · ${bound.provider} · chargée avec la localité`
              : s.downloadedSource
                ? `${s.downloadedSource.name} · ${s.downloadedSource.provider} · téléchargée pour ce dossier`
                : located
                  ? 'aucune série pour cette localité'
                  : 'aucune localité choisie'}
          </span>
          <span className="sep" />
          {/* Rang accentué : action dominante de cette rangée, sans lui
              donner l'aplat de l'avancement, qui reste au pied de page. */}
          <button className="btn btn-accent" onClick={() => setAskDownload(true)}>
            {/* Le geste reste « télécharger » : depuis cet écran on peut
                viser n'importe quel site, y compris un autre que celui du
                dossier. Le dialogue dira lui-même s'il remplace, une fois
                le lieu connu. */}
            Télécharger les données d’irradiance d’une localité…
          </button>
        </div>
      </section>

      <div className="chart-duo">
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Irradiation mensuelle</h2>
          {/* La moyenne est dite une fois, par le champ qui sait aussi
              annoncer qu'elle est périmée. Répétée ici en clair, elle
              contredisait la mention « à recalculer » deux lignes plus haut. */}
          <span className="label">
            {stale ? 'en plan des modules — à recalculer' : 'kWh/m²/jour en plan des modules'}
          </span>
          {stale && (
            <>
              <span className="sep" />
              <button className="btn" onClick={recompute}>
                Recalculer le profil
              </button>
            </>
          )}
        </div>
        <div className={`tbl-wrap ${stale ? 'is-stale' : ''}`} style={{ padding: 'var(--sp-3)' }}>
          {/* Douze barres à zéro et douze saisies à 0,0 se lisaient comme un
              site mesuré sans soleil. Tant qu'aucune série n'est chargée, on
              dit ce qui manque et par quel geste l'obtenir. */}
          {!loaded ? (
            <div className="empty" style={{ margin: 0 }}>
              <b>Aucune série météo pour ce site</b>
              {located
                ? 'Cette localité n’a pas de série en base : téléchargez-en une. Les douze mensuelles restent corrigeables à la main ensuite.'
                : 'Choisissez une localité : sa série et son orientation par défaut se chargent avec elle.'}
            </div>
          ) : (
            <>
          {/* Les barres commandent la période de la courbe voisine, et le
              second clic ramène à l'année : le lien entre les deux graphes se
              fait par le geste, sans piéger dans une vue mensuelle. */}
          <svg viewBox="0 0 480 96" preserveAspectRatio="none" style={{ width: '100%', height: 96 }}
            role="img" aria-label="Irradiation mensuelle">
            <line x1="0" y1="82" x2="480" y2="82" stroke="var(--border-strong)" />
            {mi.map((v, i) => {
              const h = (v / max) * 72;
              return (
                <rect key={i} x={i * 40 + 6} y={82 - h} width={28} height={Math.max(h, 0.5)}
                  className="bar-pick"
                  onClick={() => setMonth((m) => (m === i ? -1 : i))}
                  fill={
                    i === month
                      ? 'var(--accent-fill)'
                      : v === max
                        ? 'var(--accent)'
                        : 'var(--text-faint)'
                  }>
                  <title>{`${MONTH_NAMES[i]} · ${fmt(v, 1)} kWh/m²/j`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="month-grid">
            {mi.map((v, i) => (
              <div key={i}>
                <div className="label">{MONTHS[i]}</div>
                <input
                  className="cell-in"
                  aria-label={`Irradiation mois ${i + 1}`}
                  style={{ textAlign: 'center' }}
                  value={fmt(v, 1)}
                  onChange={(e) => {
                    const parsed = Number.parseFloat(e.target.value.replace(',', '.'));
                    update((p) => {
                      p.site.monthlyIrradiation[i] = Number.isFinite(parsed) ? parsed : 0;
                      p.site.irradiation =
                        p.site.monthlyIrradiation.reduce((a, b) => a + b, 0) / 12;
                      // Une mensuelle corrigée à la main vaut pour
                      // l'orientation affichée : elle ne périme rien.
                      p.site.irradiationBasis = { tilt: p.site.tilt, azimuth: p.site.azimuth };
                    });
                  }}
                />
              </div>
            ))}
            </div>
            </>
          )}
          </div>
        </section>

      {/* Douze totaux mensuels ne disent pas à quelle heure le soleil arrive.
          Le dimensionnement d'un stockage se joue sur l'écart entre cette
          courbe et celle des besoins ; elle méritait d'être montrée. */}
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Journée moyenne</h2>
          <span className="label">W/m² en plan des modules</span>
          <span className="sep" />
          <select
            className="mo-sel"
            aria-label="Période de la journée moyenne"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            <option value={-1}>Année entière</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className={`tbl-wrap ${stale ? 'is-stale' : ''}`} style={{ padding: 'var(--sp-3)' }}>
          {!loaded ? (
            <div className="empty" style={{ margin: 0 }}>
              <b>Pas encore de journée type</b>
              Elle se déduit de la série météo, sous l’inclinaison et l’azimut
              saisis plus haut.
            </div>
          ) : (
            <>
              <svg viewBox="0 0 480 96" preserveAspectRatio="none" style={{ width: '100%', height: 96 }}
                role="img"
                aria-label={
                  month < 0
                    ? 'Irradiance horaire moyenne sur l’année'
                    : `Irradiance horaire moyenne en ${MONTH_NAMES[month]}`
                }>
                <line x1="0" y1="82" x2="480" y2="82" stroke="var(--border-strong)" />
                {/* Sur une vue mensuelle, la moyenne annuelle reste tracée en
                    filigrane : c'est l'écart à cette référence qui dit si le
                    mois affiché est une bonne ou une mauvaise saison. */}
                {month >= 0 && (
                  <polyline
                    fill="none"
                    stroke="var(--text-faint)"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                    vectorEffect="non-scaling-stroke"
                    points={annualMeanIrradiance(s.latitude, s.tilt, s.azimuth, mi)
                      .map((v, h) => `${h * (480 / 23)},${82 - (v / dailyMax) * 72}`)
                      .join(' ')}
                  />
                )}
                <polyline
                  fill="none"
                  stroke="var(--accent-fill)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  points={daily
                    .map((v, h) => `${h * (480 / 23)},${82 - (v / dailyMax) * 72}`)
                    .join(' ')}
                />
              </svg>
              <div className="hour-axis">
                {[0, 6, 12, 18, 23].map((h) => (
                  <span key={h}>{String(h).padStart(2, '0')} h</span>
                ))}
              </div>
              <div className="daily-note">
                <span>
                  Crête <b>{fmt(Math.max(...daily), 0)} W/m²</b> vers{' '}
                  <b>{String(peakHour).padStart(2, '0')} h</b>
                </span>
                <span>
                  · cumul <b>{fmt(dailyKwh, 2)} kWh/m²/j</b>
                </span>
                {month >= 0 && (
                  <span className="label">
                    {dailyKwh >= annualKwh ? '+' : '−'}
                    {fmt(Math.abs(dailyKwh - annualKwh), 2)} vs. année
                  </span>
                )}
                <span className="sep" />
                <span className="label">
                  sous {fmt(s.tilt, 0)}° / {fmt(s.azimuth, 0)}°
                </span>
              </div>
            </>
          )}
        </div>
      </section>
      </div>

      {pickLocality && (
        <Dialog
          title="Localité du site"
          lead="coordonnées et série météo suivent le choix"
          wide
          onClose={() => setPickLocality(false)}
        >
          <input
            className="dlg-search"
            autoFocus
            placeholder="Rechercher une ville…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="proj-list" style={{ marginTop: 'var(--sp-3)' }}>
            {hits.map((l) => (
              <button
                key={l.id}
                className="proj-row"
                onClick={() => {
                  /* Choisir une localité, c'est charger tout ce qui en
                     dépend : sa série, ses douze mensuelles et l'orientation
                     par défaut de la source. `set_locality_for_sim` fait ce
                     bloc d'un coup ; le faire à moitié laissait un site
                     nommé sans soleil. */
                  const src = weatherSources.find((w) => w.locality_id === l.id) ?? null;
                  const tmy = fetchTmy(l.latitude, l.longitude);
                  const tilt = src?.default_tilt ?? tmy.optimalTilt;
                  const azimuth = src?.default_azimuth ?? tmy.optimalAzimuth;
                  update((p) => {
                    p.site.localityId = l.id;
                    p.site.region = l.name;
                    p.site.countryCode = l.country_code;
                    p.site.country = countryName(l.country_code, lang);
                    p.site.latitude = l.latitude;
                    p.site.longitude = l.longitude;
                    p.site.weatherSourceId = src?.id ?? null;
                    p.site.downloadedSource = null;
                    if (src) {
                      p.site.monthlyIrradiation = [...tmy.monthly];
                      p.site.irradiation = tmy.average;
                      p.site.tilt = tilt;
                      p.site.azimuth = azimuth;
                      p.site.irradiationBasis = { tilt, azimuth };
                    } else {
                      // Localité connue mais sans série : on ne fabrique pas
                      // un profil à partir de rien, on le dit.
                      p.site.monthlyIrradiation = new Array(12).fill(0);
                      p.site.irradiation = 0;
                      p.site.irradiationBasis = null;
                    }
                  });
                  setQ('');
                  setPickLocality(false);
                  notify({
                    kind: src ? 'success' : 'info',
                    title: `Site : ${l.name}`,
                    detail: src
                      ? `${src.source_name} chargée · orientation ${fmt(tilt, 0)}° / ${fmt(azimuth, 0)}°`
                      : 'Aucune série pour cette localité — téléchargez-en une.',
                  });
                }}
              >
                <span>
                  <b>{l.name}</b>
                  <small>{countryName(l.country_code, lang)}</small>
                </span>
                <span className="when">{fmt(l.latitude, 4)}</span>
                <span className="when">{fmt(l.longitude, 4)}</span>
                <span className={`badge ${weatherSources.some((w) => w.locality_id === l.id) ? 'ok' : ''}`}>
                  {weatherSources.some((w) => w.locality_id === l.id) ? 'série en base' : 'sans série'}
                </span>
              </button>
            ))}
            {hits.length === 0 && (
              <div className="empty" style={{ margin: 0 }}>
                <b>Aucune localité ne correspond</b>
                Passez par « Télécharger les données d’irradiance d’une localité… » :
                la localité y est créée
                depuis son nom ou ses coordonnées.
              </div>
            )}
          </div>
        </Dialog>
      )}

      {askDownload && (
        <WeatherDownload
          lang={lang}
          onClose={() => setAskDownload(false)}
          onSave={({ hit, preview, sourceName }) => {
            // Enregistrer, c'est écrire la localité, la série et l'orientation
            // par défaut d'un seul tenant — comme `save_weather_source`.
            update((p) => {
              p.site.region = hit.name;
              p.site.countryCode = hit.countryCode;
              p.site.country = countryName(hit.countryCode, lang);
              p.site.latitude = hit.latitude;
              p.site.longitude = hit.longitude;
              p.site.localityId =
                localities.find(
                  (l) =>
                    l.country_code === hit.countryCode &&
                    l.name.toLowerCase() === hit.name.toLowerCase(),
                )?.id ?? null;
              p.site.monthlyIrradiation = [...preview.monthly];
              p.site.irradiation = preview.average;
              p.site.tilt = preview.optimalTilt;
              p.site.azimuth = preview.optimalAzimuth;
              p.site.irradiationBasis = {
                tilt: preview.optimalTilt,
                azimuth: preview.optimalAzimuth,
              };
              p.site.weatherSourceId = null;
              p.site.downloadedSource = { name: sourceName, provider: 'PVGIS' };
            });
            setAskDownload(false);
            notify({
              kind: 'success',
              title: `${sourceName} enregistrée`,
              detail: `${hit.name} · orientation par défaut ${fmt(preview.optimalTilt, 0)}° / ${fmt(preview.optimalAzimuth, 0)}°. Téléchargement simulé.`,
            });
          }}
        />
      )}
    </div>
  );
}
