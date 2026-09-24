import { useEffect, useState } from 'react';
import type { SolarResourceAnalysisOutputV1 } from '@ksd/engine';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { fmt } from '../../domain/format';
import { countryName } from '../../app/models/catalogView';
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationState } from '../../app/CalculationProvider';
import { canonicalWeatherFileToProjectPayload as canonicalPayload } from '../../app/adapters/weatherFiles';
import { createSavedWeatherRecord } from '../../app/adapters/weatherLibrary';
import { Group, NumField, ReadField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Dialog } from '../../ui/Dialog';
import { CapabilityNotice } from '../../ui/CapabilityNotice';
import { WeatherDownload } from './WeatherDownload';
import { resolveDesignColdTemperatureC } from '../../app/adapters/projectToAio';
import { DecimalInput } from '../../ui/DecimalInput';
import { fill, useT } from '../../i18n';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
/** Noms de mois dans la langue de l'interface, fournis par Intl. */
function monthNames(lang: 'fr' | 'en'): readonly string[] {
  const format = new Intl.DateTimeFormat(lang === 'fr' ? 'fr-FR' : 'en-GB', { month: 'long', timeZone: 'UTC' });
  return Array.from({ length: 12 }, (_, month) => {
    const name = format.format(new Date(Date.UTC(2021, month, 1)));
    return name.charAt(0).toUpperCase() + name.slice(1);
  });
}

export function SectionSite() {
  const t = useT();
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const lang = useUi((s) => s.lang);
  const { localities, weatherSources, weatherFiles, saveWeather } = useCatalog();
  const [pickLocality, setPickLocality] = useState(false);
  const [q, setQ] = useState('');
  const [askDownload, setAskDownload] = useState(false);
  /* `-1` = année entière. C'est le profil que le moteur rend par défaut :
     `get_hourly_mean_irradiance` groupe les 8 760 pas sans filtrer de mois,
     et c'est lui qui sert de référence au γ. Le détail mensuel répond à la
     question suivante — quel mois dimensionne le stockage. */
  const [month, setMonth] = useState(-1);

  const solarState = useCalculationState<SolarResourceAnalysisOutputV1>(project.id, 'solar-resource', project.updatedAt);
  const solar = solarState.status === 'ready' ? solarState.envelope.output : null;
  const s = project.site;
  const mi = solar?.monthlyAverageDailyPoaKWhM2Day ?? Array.from({ length: 12 }, () => 0);
  const max = Math.max(...mi, 0.001);
  const recommendedMonthIndex = (solar?.designMonth ?? 0) - 1;
  const declaredMonthIndex = (s.designMonth ?? 0) - 1;
  const criticalMonthIndex = declaredMonthIndex >= 0 ? declaredMonthIndex : recommendedMonthIndex;
  const displayMonthNames = monthNames(lang);
  const sources = weatherSources.filter((w) => w.localityId === s.localityId);
  const active = sources.find((w) => w.id === s.weatherSourceId) ?? null;
  /* Un seul fournisseur, donc une seule série par localité : la première
     trouvée EST la série du site. Faire choisir entre des objets identiques
     n'était qu'une question de plus. */
  const bound = active ?? sources[0] ?? null;

  /* Le profil est en plan des modules : l'orientation enregistrée dans la
     preuve est la référence du dernier calcul affiché. */
  const basis = s.irradiationBasis;
  const loaded = solar !== null;
  const calculationCurrent = solarState.status === 'ready' && solarState.createdAt === project.updatedAt;
  const orientationChanged = s.downloadedSource !== null && (
    basis === null || basis.tilt !== s.tilt || basis.azimuth !== s.azimuth
  );
  const stale = s.downloadedSource !== null && (!calculationCurrent || orientationChanged);

  useEffect(() => {
    if (!calculationCurrent || !orientationChanged) return;
    /* The analysis is ready for the current inputs. Store its orientation as
       proof so the next render can distinguish a current result from a stale
       one without treating a loading transition as a successful calculation. */
    update((p) => {
      if (
        p.site.irradiationBasis?.tilt === p.site.tilt
        && p.site.irradiationBasis?.azimuth === p.site.azimuth
      ) return;
      p.site.irradiationBasis = { tilt: p.site.tilt, azimuth: p.site.azimuth };
    });
  }, [calculationCurrent, orientationChanged, update]);

  /* Une localité téléchargée n'est pas forcément dans le référentiel embarqué :
     c'est le nom qui atteste qu'un site est posé, pas son identifiant en base. */
  const located = s.region.trim().length > 0;

  /* Profil journalier moyen, sous l'orientation courante. `get_hourly_mean_irradiance`
     groupe l'année type par heure ; c'est cette courbe, et non les douze
     mensuelles, qui montre l'effet d'un azimut. */
  const daily = month < 0 ? solar?.meanHourlyPoaWm2 ?? Array.from({ length: 24 }, () => 0) : solar?.monthlyMeanHourlyPoaWm2[month] ?? Array.from({ length: 24 }, () => 0);
  const dailyMax = Math.max(...daily, 1);
  const peakHour = daily.indexOf(Math.max(...daily));
  /* Le cumul du profil affiché, en kWh/m²/j : sur l'année il doit retomber
     sur la moyenne pondérée des douze mensuelles, ce qui rend les deux vues
     comparables au lieu de les laisser vivre chacune de son côté. */
  const dailyKwh = daily.reduce((a, b) => a + b, 0) / 1000;
  const annualKwh = solar === null ? 0 : solar.annualPoaKWhM2 / 365;

  const needle = q.trim().toLowerCase();
  const sortedLocalities = [...localities].sort((left, right) => left.name.localeCompare(right.name, lang));
  const hits = needle
    ? sortedLocalities.filter((l) => l.name.toLowerCase().includes(needle)).slice(0, 8)
    : sortedLocalities.slice(0, 8);

  /* Sans météo, rien ne se calcule : la source météo devient alors la première action de la page
     (FR-034). Une fois la série liée, elle reprend sa place sous les coordonnées. */
  const missingWeather = s.downloadedSource === null;
  const weatherSection = (
    <section className={missingWeather ? 'weather-first' : undefined}>
      <div className="tbl-title">
        <h2 className="h-sec">{t('site.weatherSource')}</h2>
        {/* La série suit la localité : elle se lit, elle ne se choisit plus.
            Un seul fournisseur et une série par lieu — le choix portait sur
            des objets indiscernables. */}
        <span className="label">
          {bound
            ? `${bound.sourceName} · ${bound.provider} · ${t('site2.verifiedWithLocality')}`
            : s.downloadedSource
              ? `${s.downloadedSource.name} · ${s.downloadedSource.provider} · ${t('site2.downloadedForProject')}`
              : located
                ? t('site2.aucuneSeriePourCette')
                : t('site2.aucuneLocaliteChoisie')}
        </span>
        <span className="sep" />
        {/* Le geste reste « télécharger » : depuis cet écran on peut viser n'importe quel site, y
            compris un autre que celui du dossier. Le dialogue dira lui-même s'il remplace. */}
        <button className="btn btn-accent" onClick={() => setAskDownload(true)}>
          {t('weather2.telechargerLesDonneesD')}…
        </button>
      </div>
      {missingWeather && <p className="weather-first-lead">{t('site.weatherFirstLead')}</p>}
      {solarState.status !== 'ready' && <CapabilityNotice capability="solar-resource" state={solarState} compact />}
    </section>
  );


  return (
    <div className="sheet">
      <StepHead
        slug="site"
        aside={
          <span className="label">
            {localities.length} {localities.length > 1 ? t('site2.localitesVerifiees') : t('site2.localiteVerifiee')} · {weatherFiles.length} {weatherFiles.length > 1 ? t('site2.fichiersMeteo') : t('site2.fichierMeteo')}
          </span>
        }
      />

      {missingWeather && weatherSection}

      <div className="form-grid">
        <Group title={t('site2.coordonnees')}>
          <label>
            <span>{t('site.locality')}</span>
            <button className="pickfield" onClick={() => setPickLocality(true)}>
              <b>{s.region || t('site2.chooseLocality')}</b>
              <small>{s.countryCode ? countryName(s.countryCode, lang) : s.country || '—'}</small>
            </button>
          </label>
          {/* Le pays et les coordonnées descendent de la localité : les
              présenter en saisie invitait à écrire une valeur que le prochain
              choix de localité écraserait sans prévenir. */}
          <ReadField
            label={t('site2.pays')}
            value={s.countryCode ? countryName(s.countryCode, lang) : s.country || '—'}
            prov={{
              title: 'Pays',
              rows: [
                [t('site2.localite'), s.region || '—'],
                [t('site2.countryCode'), s.countryCode || '—'],
              ],
              source: t('site2.deduitDuCodePays'),
            }}
          />
          <ReadField
            label={t('site2.latitude')}
            value={located ? fmt(s.latitude, 4) : '—'}
            unit={located ? '°' : undefined}
            prov={{
              title: 'Latitude',
              rows: [[t('site2.localite'), s.region || '—']],
              source: t('site2.coordonneesDeLaLocalite'),
            }}
          />
          <ReadField
            label={t('site2.longitude')}
            value={located ? fmt(s.longitude, 4) : '—'}
            unit={located ? '°' : undefined}
            prov={{
              title: 'Longitude',
              rows: [[t('site2.localite'), s.region || '—']],
              source: t('site2.coordonneesDeLaLocalite'),
            }}
          />
        </Group>

        <Group title={t('site2.orientationDuChamp')}>
          {/* Chaque angle porte son propre calcul d'optimum, comme
              `optimal_tilt_button` et `optimal_azimuth_button`. Une case
              « Valeurs optimales » posée à côté ne disait plus quel angle
              elle allait changer, et en changeait deux. */}
          <NumField
            label={t('site2.inclinaison')}
            unit="°"
            value={s.tilt}
            onChange={(v) => update((p) => { p.site.tilt = v; })}
            decimals={1}
            action={{
              icon: '✳',
              title: located
                ? fill(t('site2.optimalTiltFor'), { lat: fmt(s.latitude, 2) })
                : t('site2.choisissezDAbordUne'),
              disabled: !located,
              onClick: () => {
                const tilt = optimalTiltFor(s.latitude);
                update((p) => { p.site.tilt = tilt; });
                notify({
                  kind: 'success',
                  title: `${t('site2.optimalTilt')} ${fmt(tilt, 0)}°`,
                  detail: t('site2.07631'),
                });
              },
            }}
          />
          <NumField
            label={t('site2.azimut')}
            unit="°"
            value={s.azimuth}
            onChange={(v) => update((p) => { p.site.azimuth = v; })}
            decimals={1}
            action={{
              icon: '✳',
              title: located
                ? t('site2.azimutOptimalPleinSud')
                : t('site2.choisissezDAbordUne'),
              disabled: !located,
              onClick: () => {
                const a = optimalAzimuthFor(s.latitude);
                update((p) => { p.site.azimuth = a; });
                notify({
                  kind: 'success',
                  title: `${t('site2.optimalAzimuth')} ${fmt(a, 0)}°`,
                  detail:
                    s.latitude > 0
                      ? t('site2.hemisphereNordLeChamp')
                      : t('site2.hemisphereSudLeChamp'),
                });
              },
            }}
          />
          <label>
            <span>{t('site.designMonth')}</span>
            <select
              aria-label={t('site.designMonth')}
              value={s.designMonth ?? ''}
              disabled={!loaded}
              onChange={(event) => update((p) => {
                p.site.designMonth = event.target.value === '' ? null : Number(event.target.value);
              })}
            >
              <option value="">
                {recommendedMonthIndex >= 0
                  ? `${t('site.recommendedMonth')} · ${displayMonthNames[recommendedMonthIndex]}`
                  : t('site.choose')}
              </option>
              {displayMonthNames.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}
            </select>
            <span className="ro-note field-hint">{t('site.designMonthHint')}</span>
          </label>
          {/* L'irradiation n'est jamais saisie : elle est sommée depuis la
              série météo sous l'orientation courante. Sans série, « 0,00 » se
              lisait comme un site sans soleil. */}
          <ReadField
            label={t('site2.irradiationMoyenne')}
            value={loaded ? fmt(annualKwh, 2) : '—'}
            unit={loaded ? 'kWh/m²/j' : undefined}
            stale={stale}
            note={
              !loaded
                ? t('site2.aucuneSerieChargee')
                : stale
                  ? fill(t('site2.computedUnder'), { tilt: fmt(basis?.tilt ?? 0, 0), azimuth: fmt(basis?.azimuth ?? 0, 0) })
                  : undefined
            }
            prov={{
              title: t('site2.irradiationMoyenne'),
              formula: t('site2.moyenneDes12Mensuelles'),
              rows: [
                [t('site2.weatherSeries'), bound ? bound.sourceName : s.downloadedSource?.name ?? 'aucune'],
                ['Inclinaison', `${fmt(basis?.tilt ?? s.tilt, 0)} °`],
                ['Azimut', `${fmt(basis?.azimuth ?? s.azimuth, 0)} °`],
                [t('site2.recommendedMonth'), recommendedMonthIndex >= 0 ? displayMonthNames[recommendedMonthIndex] : '—'],
                [t('site2.declaredMonth'), declaredMonthIndex >= 0 ? displayMonthNames[declaredMonthIndex] : t('site2.toConfirm')],
                [t('site2.albedo'), solar === null ? '—' : fmt(solar.albedo, 2)],
                [t('site2.sourcePeriod'), s.downloadedSource?.versionOrDate ?? '—'],
                ['Fuseau', s.timezoneIana ?? '—'],
                [t('site2.sha256'), s.downloadedSource?.sourceSha256?.slice(0, 16) ?? '—'],
              ],
              source: t('site2.sommeeDepuisLaSerie'),
            }}
          />
        </Group>

        <Group title={t('site.designTemperatures')}>
          <DesignColdTemperatureField
            overrideC={s.designColdTemperatureC}
            ambientMinC={s.downloadedSource?.ambientTemperatureMinC}
            onChange={(value) => update((p) => { p.site.designColdTemperatureC = value; })}
          />
          <ReadField
            label={t('site.ambientMax')}
            value={s.downloadedSource?.ambientTemperatureMaxC === undefined ? '—' : fmt(s.downloadedSource.ambientTemperatureMaxC, 1)}
            unit={s.downloadedSource?.ambientTemperatureMaxC === undefined ? undefined : '°C'}
            note={s.downloadedSource?.ambientTemperatureMaxC === undefined ? t('site.temperatureNeedsWeather') : t('site.ambientMaxNote')}
          />
        </Group>
      </div>

      {!missingWeather && weatherSection}

      <div className="chart-duo">
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">{t('site.monthlyIrradiation')}</h2>
          {/* La moyenne est dite une fois, par le champ qui sait aussi
              annoncer qu'elle est périmée. Répétée ici en clair, elle
              contredisait la mention « à recalculer » deux lignes plus haut. */}
          <span className="label">
            {stale
              ? t('site2.enPlanDesModules')
              : `${t('site2.kwhPerDayPoa')}${criticalMonthIndex >= 0 ? ` · ${declaredMonthIndex >= 0 ? t('site2.moisCritiqueDeclare') : t('site2.recommandationAConfirmer')} ${displayMonthNames[criticalMonthIndex]}` : ''}`}
          </span>
        </div>
        <div className={`tbl-wrap ${stale ? 'is-stale' : ''}`} style={{ padding: 'var(--sp-3)' }}>
          {/* Douze barres à zéro et douze saisies à 0,0 se lisaient comme un
              site mesuré sans soleil. Tant qu'aucune série n'est chargée, on
              dit ce qui manque et par quel geste l'obtenir. */}
          {!loaded ? (
            <div className="empty" style={{ margin: 0 }}>
              <b>{t('site.noWeatherForSite')}</b>
              {located
                ? t('site2.cetteLocaliteNA')
                : t('site2.choisissezUneLocaliteSa')}
            </div>
          ) : (
            <>
          {/* Les barres commandent la période de la courbe voisine, et le
              second clic ramène à l'année : le lien entre les deux graphes se
              fait par le geste, sans piéger dans une vue mensuelle. */}
          <svg viewBox="0 0 480 96" preserveAspectRatio="none" style={{ width: '100%', height: 96 }}
            role="img" aria-label={t('site2.irradiationMensuelle')}>
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
                      : i === criticalMonthIndex
                        ? 'var(--accent)'
                        : 'var(--text-faint)'
                  }>
                  <title>{`${displayMonthNames[i]} · ${fmt(v, 1)} kWh/m²/j`}</title>
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
                  aria-label={fill(t('site2.irradiationMonth'), { month: i + 1 })}
                  style={{ textAlign: 'center' }}
                  readOnly
                  value={fmt(v, 1)}
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
          <h2 className="h-sec">{t('site.averageDay')}</h2>
          <span className="label">{t('site2.wMEnPlan')}</span>
          <span className="sep" />
          <select
            className="mo-sel"
            aria-label={t('site2.periodeDeLaJournee')}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            <option value={-1}>{t('site.fullYear')}</option>
            {displayMonthNames.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className={`tbl-wrap ${stale ? 'is-stale' : ''}`} style={{ padding: 'var(--sp-3)' }}>
          {!loaded ? (
            <div className="empty" style={{ margin: 0 }}>
              <b>{t('site.noTypicalDay')}</b>
              {t('site.noTypicalDayHelp')}
            </div>
          ) : (
            <>
              <svg viewBox="0 0 480 96" preserveAspectRatio="none" style={{ width: '100%', height: 96 }}
                role="img"
                aria-label={
                  month < 0
                    ? t('site2.irradianceHoraireMoyenneSur')
                    : fill(t('site2.meanHourlyIn'), { month: displayMonthNames[month]! })
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
                    points={(solar?.meanHourlyPoaWm2 ?? [])
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
                  {t('site.dailyPeak')} <b>{fmt(Math.max(...daily), 0)} W/m²</b> {t('site.dailyAt')}{' '}
                  <b>{String(peakHour).padStart(2, '0')} h</b>
                </span>
                <span>
                  · {t('site.dailyTotal')} <b>{fmt(dailyKwh, 2)} {t('site.kwhPerM2Day')}</b>
                </span>
                {month >= 0 && (
                  <span className="label">
                    {dailyKwh >= annualKwh ? '+' : '−'}
                    {fmt(Math.abs(dailyKwh - annualKwh), 2)} {t('site.vsYear')}
                  </span>
                )}
                <span className="sep" />
                <span className="label">
                  {fill(t('site.underOrientation'), { tilt: fmt(s.tilt, 0), azimuth: fmt(s.azimuth, 0) })}
                </span>
              </div>
            </>
          )}
        </div>
      </section>
      </div>

      {pickLocality && (
        <Dialog
          title={t('site2.localiteDuSite')}
          lead={t('site2.coordonneesEtSerieMeteo')}
          wide
          onClose={() => setPickLocality(false)}
        >
          <input
            className="dlg-search"
            autoFocus
            placeholder={t('site2.rechercherUneVille')}
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
                  const src = weatherSources.find((w) => w.localityId === l.id) ?? null;
                  const file = weatherFiles.find((candidate) => candidate.metadata.weatherSourceId === src?.id) ?? null;
                  const tilt = src?.defaultTiltDeg ?? optimalTiltFor(l.latitudeDeg);
                  const azimuth = src?.defaultAzimuthDeg ?? optimalAzimuthFor(l.latitudeDeg);
                  update((p) => {
                    p.site.localityId = l.id;
                    p.site.region = l.name;
                    p.site.countryCode = l.countryCode;
                    p.site.country = countryName(l.countryCode, lang);
                    p.site.latitude = l.latitudeDeg;
                    p.site.longitude = l.longitudeDeg;
                    p.site.timezoneIana = l.timezone;
                    p.site.weatherSourceId = src?.id ?? null;
                    p.site.designMonth = null;
                    if (src && file) {
                      p.site.tilt = tilt;
                      p.site.azimuth = azimuth;
                      p.site.irradiationBasis = { tilt, azimuth };
                      const payload = canonicalPayload(file);
                      p.site.downloadedSource = {
                        name: src.sourceName,
                        provider: src.provider,
                        versionOrDate: `TMY ${file.metadata.yearMin}–${file.metadata.yearMax}`,
                        locator: file.metadata.relativePath,
                        retrievedAtIso: file.metadata.retrievedAtIso,
                        qualityFlags: ['pvgis-hourly-file-verified'],
                        ...payload,
                        hourlyIrradiance: [...payload.hourlyIrradiance],
                      };
                    } else {
                      // Localité connue mais sans série : on ne fabrique pas
                      // un profil à partir de rien, on le dit.
                      p.site.monthlyIrradiation = Array.from({ length: 12 }, () => 0);
                      p.site.irradiation = 0;
                      p.site.irradiationBasis = null;
                      p.site.downloadedSource = null;
                    }
                  });
                  setQ('');
                  setPickLocality(false);
                  notify({
                    kind: src && file ? 'success' : 'info',
                    title: `Site : ${l.name}`,
                    detail: src && file
                      ? `${src.sourceName} · ${fill(t('site2.loadedWithOrientation'), { tilt: fmt(tilt, 0), azimuth: fmt(azimuth, 0) })}`
                      : t('site2.aucunFichierPourCette'),
                  });
                }}
              >
                <span>
                  <b>{l.name}</b>
                  <small>{countryName(l.countryCode, lang)}</small>
                </span>
                <span className="when">{fmt(l.latitudeDeg, 4)}</span>
                <span className="when">{fmt(l.longitudeDeg, 4)}</span>
                <span className={`badge ${weatherFiles.some((file) => file.metadata.localityId === l.id) ? 'ok' : ''}`}>
                  {weatherFiles.some((file) => file.metadata.localityId === l.id) ? t('site2.jsonVerifie') : t('site2.sansFichier')}
                </span>
              </button>
            ))}
            {hits.length === 0 && (
              <div className="empty" style={{ margin: 0 }}>
                <b>{t('site.noLocality')}</b>
                {t('site.noLocalityHelp')}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {askDownload && (
        <WeatherDownload
          lang={lang}
          onClose={() => setAskDownload(false)}
          onSave={async (result) => {
            // Enregistrer, c'est écrire la localité, la série et l'orientation
            // par défaut d'un seul tenant — comme `save_weather_source`. La
            // bibliothèque locale garde le fichier original après rechargement.
            await saveWeather(createSavedWeatherRecord({
              siteName: result.siteName,
              countryCode: result.countryCode,
              sourceName: result.sourceName,
              locator: result.locator,
              optimalTilt: result.optimalTilt,
              optimalAzimuth: result.optimalAzimuth,
              timezoneIana: result.timezoneIana,
              file: result.file,
            }));
            update((p) => {
              p.site.region = result.siteName;
              p.site.countryCode = result.countryCode;
              p.site.country = countryName(result.countryCode, lang);
              p.site.latitude = result.latitude;
              p.site.longitude = result.longitude;
              p.site.timezoneIana = result.timezoneIana;
              p.site.localityId = result.file.metadata.localityId;
              p.site.monthlyIrradiation = [...result.monthly];
              p.site.irradiation = result.monthly.reduce((sum, value) => sum + value, 0) / 12;
              p.site.tilt = result.optimalTilt;
              p.site.azimuth = result.optimalAzimuth;
              p.site.irradiationBasis = {
                tilt: result.optimalTilt,
                azimuth: result.optimalAzimuth,
              };
              p.site.designMonth = null;
              p.site.weatherSourceId = result.weatherSourceId;
              p.site.downloadedSource = {
                name: result.sourceName,
                provider: 'PVGIS',
                versionOrDate: result.versionOrDate,
                locator: result.locator,
                retrievedAtIso: result.retrievedAtIso,
                qualityFlags: ['pvgis-hourly-file-verified'],
                ...result.payload,
                hourlyIrradiance: [...result.payload.hourlyIrradiance],
              };
            });
            setAskDownload(false);
            notify({
              kind: 'success',
              title: fill(t('site2.sourceSaved'), { name: result.sourceName }),
              detail: `${result.siteName} · ${fill(t('site2.realHoursOrientation'), { tilt: fmt(result.optimalTilt, 0), azimuth: fmt(result.optimalAzimuth, 0) })}`,
            });
          }}
        />
      )}
    </div>
  );
}

function optimalTiltFor(latitudeDeg: number): number {
  return Math.min(90, Math.max(0, Math.round((0.76 * Math.abs(latitudeDeg) + 3.1) / 5) * 5));
}

function optimalAzimuthFor(latitudeDeg: number): number {
  return latitudeDeg >= 0 ? 180 : 0;
}

/**
 * Température minimale de conception pour le Voc à froid. Vide : le minimum de
 * la série météo s'applique et reste visible ; une saisie le remplace.
 */
function DesignColdTemperatureField({ overrideC, ambientMinC, onChange }: { overrideC: number | null; ambientMinC: number | undefined; onChange: (value: number | null) => void }) {
  const t = useT();
  const derived = resolveDesignColdTemperatureC(null, ambientMinC);
  const effective = overrideC ?? derived;
  return (
    <label>
      <span>{t('site.designColdTemperature')}</span>
      <span className="uf">
        <DecimalInput
          aria-label={t('site.designColdTemperature')}
          placeholder={derived === null ? t('site.temperatureRequired') : String(derived)}
          value={overrideC}
          min={-60}
          max={40}
          decimals={1}
          allowEmpty
          onCommit={onChange}
        />
        <span className="uf-unit">°C</span>
      </span>
      <small className={effective === null ? 'field-note error' : 'field-note'}>
        {effective === null ? t('site.temperatureRequiredHelp') : overrideC === null ? t('site.coldFromWeather') : t('site.coldManual')}
      </small>
    </label>
  );
}
