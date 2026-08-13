/**
 * Téléchargement d'une série météo, en trois temps.
 *
 * Le logiciel enchaîne trois gestes distincts et n'ouvre le suivant qu'une
 * fois le précédent abouti : localiser (`find_location_from_gps` ou
 * `find_coords_from_locality`, qui seuls arment `download_enabled_changed`),
 * télécharger pour voir (`temp_weather_source`, rien n'est écrit), puis
 * enregistrer (`save_weather_source`). Un bouton unique fusionnait un essai
 * et une écriture ; on garde les trois.
 */

import { useRef, useState } from 'react';
import { fmt } from '../../domain/format';
import { useCatalog } from '../../app/CatalogProvider';
import { countryName, localityToView, weatherSourceToView } from '../../app/models/catalogView';
import {
  coordsFromPlace,
  existingSeriesFor,
  geocodableCountries,
  localityFor,
  placeFromCoords,
  type GeoHit,
} from '../../domain/geocode';
import { fetchTmy, readTmyFile, type TmyPreview } from '../../domain/tmy';
import { parseNum, ReadField } from '../../ui/Field';
import { Dialog } from '../../ui/Dialog';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export interface WeatherResult {
  hit: GeoHit;
  preview: TmyPreview;
  sourceName: string;
}

export function WeatherDownload({
  lang,
  onClose,
  onSave,
}: {
  lang: 'fr' | 'en';
  onClose: () => void;
  onSave: (r: WeatherResult) => void;
}) {
  const [mode, setMode] = useState<'town' | 'gps' | 'file'>('town');
  const [country, setCountry] = useState('TG');
  const [town, setTown] = useState('');
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [hit, setHit] = useState<GeoHit | null>(null);
  const [miss, setMiss] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<TmyPreview | null>(null);
  const [file, setFile] = useState<{ name: string; kind: string; columns: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const catalog = useCatalog();
  const localities = catalog.localities.map(localityToView);
  const weatherSources = catalog.weatherSources.map(weatherSourceToView);

  const countryList = geocodableCountries(lang, localities);

  /** Changer de saisie invalide la position trouvée : on ne télécharge que
      ce qu'on vient de vérifier. */
  const reset = () => {
    setHit(null);
    setPreview(null);
    setMiss(null);
    setFile(null);
  };

  const search = () => {
    setMiss(null);
    const found =
      mode === 'town'
        ? coordsFromPlace(country, town, localities)
        : placeFromCoords(parseNum(lat), parseNum(lon), localities);
    if (!found) {
      setHit(null);
      setMiss(
        mode === 'town'
          ? `Aucune position trouvée pour « ${town.trim() || '—'} » dans ce pays.`
          : 'Aucun lieu connu à proximité de ce point. Vérifiez la latitude et la longitude.',
      );
      return;
    }
    setHit(found);
    setPreview(null);
  };

  const download = () => {
    if (!hit) return;
    setBusy(true);
    setTimeout(() => {
      setPreview(fetchTmy(hit.latitude, hit.longitude));
      setBusy(false);
    }, 900);
  };

  /**
   * Lecture d'un export PVGIS déjà en main. Le fichier porte la position et
   * la série : il remplit les deux premiers temps d'un coup, et le nom du
   * site reste corrigeable puisque c'est lui qui nommera la source.
   */
  const openFile = async (f: File) => {
    setMiss(null);
    setBusy(true);
    const text = await f.text();
    const read = readTmyFile(f.name, text);
    setBusy(false);
    if ('error' in read) {
      setFile(null);
      setPreview(null);
      setHit(null);
      setMiss(read.error);
      return;
    }
    const place = read.place;
    const found = place ? placeFromCoords(place.latitude, place.longitude, localities) : null;
    setHit(
      found ?? {
        name: f.name.replace(/\.(json|csv)$/i, ''),
        countryCode: country,
        latitude: place?.latitude ?? 0,
        longitude: place?.longitude ?? 0,
        known: false,
      },
    );
    setFile({ name: f.name, kind: read.kind.toUpperCase(), columns: read.columns });
    setPreview(read.preview);
  };

  /* Localité connue : par le nom si le point s'y accorde, sinon par la
     proximité. Comparer les seuls noms rattachait à Alger un site situé à
     deux cents kilomètres, parce que le repère proposé porte ce nom. */
  const existing = hit ? localityFor(hit.countryCode, hit.name, hit.latitude, hit.longitude, localities) : null;
  const sourceName = hit ? `${hit.name} PVGIS-TMY` : '';
  const max = preview ? Math.max(...preview.monthly, 0.001) : 1;
  /* Remplacer ou ajouter se décide sur le lieu VISÉ, une fois qu'il est
     trouvé — pas sur la série déjà ouverte dans le dossier. Choisir Alger
     puis télécharger Kara n'écrase rien : ce sont deux sites distincts.
     Tant que rien n'est localisé, la question ne se pose pas encore. */
  const clash = hit ? existingSeriesFor(
    hit.countryCode,
    hit.name,
    hit.latitude,
    hit.longitude,
    localities,
    weatherSources,
  ) : null;
  const replaces = clash !== null;

  return (
    <Dialog
      title="Télécharger les données d’irradiance d’une localité"
      lead="PVGIS · année type"
      wide
      onClose={onClose}
      footer={
        <>
          {/* Annuler ne fait rien avancer et n'écrit rien : rang fantôme,
              à gauche. L'écriture est primaire, à droite. */}
          <button className="btn btn-ghost" onClick={onClose}>
            Annuler
          </button>
          <button
            /* Rang validation : enregistrer confirme un choix et écrit, mais
               ne fait pas avancer l'étape — l'avancement reste au pied de
               page, en orange. */
            className="btn btn-ok"
            disabled={!preview}
            onClick={() => preview && hit && onSave({ hit, preview, sourceName })}
          >
            {replaces ? 'Remplacer la série' : 'Enregistrer en base'}
          </button>
        </>
      }
    >
      {/* Temps 1 — où. C'est la seule question que le service pose : l'appel
          PVGIS ne prend qu'une latitude et une longitude. */}
      <div className="dlg-step">
        <span className="dlg-num">1</span>
        <span className="dlg-step-t">{mode === 'file' ? 'Ouvrir un export PVGIS' : 'Localiser le site'}</span>
        <span className="sep" />
        <span className="seg">
          <button
            aria-selected={mode === 'town'}
            onClick={() => { setMode('town'); reset(); }}
          >
            Par pays et ville
          </button>
          <button
            aria-selected={mode === 'gps'}
            onClick={() => { setMode('gps'); reset(); }}
          >
            Par coordonnées
          </button>
          {/* Troisième voie : sur un poste sans accès sortant, le fichier
              récupéré ailleurs est la seule façon d'obtenir une année type. */}
          <button
            aria-selected={mode === 'file'}
            onClick={() => { setMode('file'); reset(); }}
          >
            Depuis un fichier
          </button>
        </span>
      </div>

      {mode === 'file' ? (
        <div className="file-drop">
          <input
            ref={fileRef}
            type="file"
            accept=".json,.csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openFile(f);
            }}
          />
          <button className="btn btn-field" onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? 'Lecture…' : file ? 'Choisir un autre fichier…' : 'Choisir un fichier…'}
          </button>
          <span className="label">
            {file
              ? `${file.name} · ${file.kind} · colonnes : ${file.columns.slice(0, 5).join(', ')}`
              : 'Export PVGIS horaire, JSON ou CSV. La position est lue dans le fichier.'}
          </span>
        </div>
      ) : (
      <div className="form-rows">
        {mode === 'town' ? (
          <>
            <label>
              <span>Pays</span>
              <select
                style={{ fontFamily: 'var(--font-sans)' }}
                value={country}
                onChange={(e) => { setCountry(e.target.value); reset(); }}
              >
                {countryList.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Ville</span>
              <input
                style={{ fontFamily: 'var(--font-sans)' }}
                placeholder="ex. Kara, Sokodé…"
                value={town}
                onChange={(e) => { setTown(e.target.value); reset(); }}
                onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
              />
            </label>
          </>
        ) : (
          <>
            <label>
              <span>Latitude</span>
              <span className="uf">
                <input
                  placeholder="10,7030"
                  value={lat}
                  onChange={(e) => { setLat(e.target.value); reset(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                />
                <span className="uf-unit">°</span>
              </span>
            </label>
            <label>
              <span>Longitude</span>
              <span className="uf">
                <input
                  placeholder="0,2099"
                  value={lon}
                  onChange={(e) => { setLon(e.target.value); reset(); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
                />
                <span className="uf-unit">°</span>
              </span>
            </label>
          </>
        )}
        {/* Rang normal, taille formulaire : l'action partage sa rangée avec
            des champs de 30 px, un bouton de barre y flottait. */}
        <label>
          <span aria-hidden="true">&nbsp;</span>
          <button
            className="btn btn-field"
            onClick={search}
            disabled={mode === 'town' ? !town.trim() : !lat.trim() || !lon.trim()}
          >
            Rechercher
          </button>
        </label>
      </div>
      )}

      {miss && <div className="alert warn" style={{ marginTop: 'var(--sp-3)' }}>{miss}</div>}

      {/* Le lieu visé a déjà une série : on nomme ce qui va disparaître, et
          on le dit ici — après la recherche, puisque avant elle personne, pas
          même l'écran, ne sait de quel site il s'agira. */}
      {clash && (
        <div className="alert warn" style={{ marginTop: 'var(--sp-3)' }}>
          <b>{clash.source.source_name}</b> existe déjà pour {clash.locality.name}
          {clash.locality.name.toLowerCase() !== hit?.name.trim().toLowerCase() && (
            <> (à moins de 15 km du point visé)</>
          )}
          . L’enregistrement la remplace ; les douze mensuelles et l’orientation
          par défaut seront reprises de la nouvelle série.
        </div>
      )}

      {/* La moitié que l'on n'a pas saisie est renseignée par la recherche :
          elle se lit, elle ne s'écrit pas. */}
      {hit && (
        <div className="form-rows" style={{ marginTop: 'var(--sp-3)' }}>
          {mode === 'town' ? (
            <>
              {/* Une ville absente du référentiel reçoit un point approché
                  depuis le repère du pays. Rendu sans mention, il se lisait
                  comme une position relevée — et l'année type téléchargée
                  aurait porté sur un autre endroit. */}
              <ReadField
                label="Latitude trouvée"
                value={fmt(hit.latitude, 4)}
                unit="°"
                note={hit.known ? undefined : 'position approchée'}
              />
              <ReadField
                label="Longitude trouvée"
                value={fmt(hit.longitude, 4)}
                unit="°"
                note={hit.known ? undefined : 'à vérifier avant de télécharger'}
              />
            </>
          ) : (
            <>
              <ReadField label="Pays trouvé" value={countryName(hit.countryCode, lang)} />
              {mode === 'file' && (
                <ReadField
                  label="Position lue"
                  value={`${fmt(hit.latitude, 4)} / ${fmt(hit.longitude, 4)}`}
                  unit="°"
                />
              )}
              {/* Le point saisi tombe rarement pile sur une ville connue : on
                  propose le repère le plus proche et on laisse corriger le nom,
                  puisque c'est lui qui nommera la source enregistrée. */}
              <label>
                <span>{hit.known ? 'Ville trouvée' : 'Nom du site'}</span>
                <input
                  style={{ fontFamily: 'var(--font-sans)' }}
                  value={hit.name}
                  onChange={(e) => setHit({ ...hit, name: e.target.value })}
                />
              </label>
            </>
          )}
          <ReadField
            label="Statut"
            value={replaces ? 'série déjà en base' : existing ? 'localité déjà en base' : 'nouvelle localité'}
            note={
              replaces
                ? 'sa série sera remplacée'
                : existing
                  ? 'la série viendra s’ajouter'
                : mode === 'gps' && hit.km !== undefined && !hit.known
                  ? `repère le plus proche à ${hit.km} km`
                  : 'sera créée à l’enregistrement'
            }
          />
        </div>
      )}

      {/* Temps 2 — voir avant d'accepter. Le logiciel garde le résultat dans
          `temp_weather_source` : à ce stade la base est intacte. */}
      {mode !== 'file' && (
      <div className={`dlg-step ${hit ? '' : 'is-off'}`}>
        <span className="dlg-num">2</span>
        <span className="dlg-step-t">Télécharger et prévisualiser</span>
        <span className="sep" />
        <span className="label">rien n’est écrit à cette étape</span>
        <button className="btn" onClick={download} disabled={!hit || busy}>
          {busy ? 'Téléchargement…' : preview ? 'Retélécharger' : 'Télécharger'}
        </button>
      </div>
      )}

      {preview && (
        <>
          <div className="tbl-wrap" style={{ padding: 'var(--sp-3)' }}>
            <svg viewBox="0 0 480 72" preserveAspectRatio="none" style={{ width: '100%', height: 72 }}
              role="img" aria-label="Aperçu de l’irradiation mensuelle">
              <line x1="0" y1="62" x2="480" y2="62" stroke="var(--border-strong)" />
              {preview.monthly.map((v, i) => {
                const h = (v / max) * 54;
                return (
                  <rect key={i} x={i * 40 + 6} y={62 - h} width={28} height={Math.max(h, 0.5)}
                    fill={v === max ? 'var(--accent)' : 'var(--text-faint)'} />
                );
              })}
            </svg>
            <div className="month-grid">
              {preview.monthly.map((v, i) => (
                <div key={i}>
                  <div className="label">{MONTHS[i]}</div>
                  <div className="prev-m">{fmt(v, 1)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="dlg-recap">
            <div>
              <span>Nom de la source</span>
              <b>{sourceName}</b>
            </div>
            <div>
              <span>Reçu</span>
              <b>{fmt(preview.hourlySteps, 0)} pas horaires · 12 moyennes</b>
            </div>
            <div>
              <span>Irradiation moyenne</span>
              <b>{fmt(preview.average, 2)} kWh/m²/j</b>
            </div>
            <div>
              <span>Orientation optimale</span>
              <b>
                {fmt(preview.optimalTilt, 0)}° / {fmt(preview.optimalAzimuth, 0)}°
              </b>
            </div>
          </div>

          {/* Temps 3 — le seul geste qui écrit. */}
          <div className="dlg-step">
            <span className="dlg-num">{mode === 'file' ? '2' : '3'}</span>
            <span className="dlg-step-t">{replaces ? 'Remplacer la série' : 'Enregistrer en base'}</span>
            <span className="sep" />
            <span className="label">
              {replaces
                ? `écrase la série de ${clash.locality.name}`
                : existing
                  ? 'ajoute une série à une localité connue'
                  : 'crée la localité et sa série'}
            </span>
          </div>
        </>
      )}
    </Dialog>
  );
}
