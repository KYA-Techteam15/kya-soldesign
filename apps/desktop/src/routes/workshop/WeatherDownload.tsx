import { useMemo, useRef, useState } from 'react';
import { analyzeSolarResource } from '@ksd/engine';
import type { Locality } from '@ksd/domain';
import { canonicalWeatherFileToProjectPayload, type ProjectWeatherPayload } from '../../app/adapters/weatherFiles';
import { GeocodingClient, GeocodingError, type GeocodedSite } from '../../app/adapters/geocodingClient';
import { useCatalog } from '../../app/CatalogProvider';
import { countryName } from '../../app/models/catalogView';
import { fmt } from '../../domain/format';
import { Dialog } from '../../ui/Dialog';
import type { CanonicalWeatherFile } from '../../app/contracts';
import { PvgisClient, WeatherAcquisitionError } from '../../app/adapters/pvgisClient';
import { useT } from '../../i18n';
import { isDecimalDraft } from '../../app/models/formValues';
import { ISO_ALPHA2_COUNTRIES } from '../../app/models/countryReference';

const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

export interface WeatherResult {
  readonly siteName: string;
  readonly countryCode: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly timezoneIana: string | null;
  readonly sourceName: string;
  readonly weatherSourceId: string;
  readonly versionOrDate: string;
  readonly locator: string;
  readonly retrievedAtIso: string;
  readonly payload: ProjectWeatherPayload;
  readonly monthly: readonly number[];
  readonly optimalTilt: number;
  readonly optimalAzimuth: number;
  readonly radiationDatabase: string;
  readonly file: CanonicalWeatherFile;
}

export function WeatherDownload({ lang, onClose, onSave }: {
  readonly lang: 'fr' | 'en';
  readonly onClose: () => void;
  readonly onSave: (result: WeatherResult) => void | Promise<void>;
}) {
  const t = useT();
  const { localities, weatherFiles, weatherSources } = useCatalog();
  const [mode, setMode] = useState<'town' | 'gps' | 'file'>('town');
  const [countryCode, setCountryCode] = useState('TG');
  const [town, setTown] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [siteName, setSiteName] = useState('');
  const [timezoneIana, setTimezoneIana] = useState('Africa/Lome');
  const [hit, setHit] = useState<GeocodedSite | null>(null);
  /**
   * Le géocodage a échoué mais les coordonnées, elles, sont là.
   *
   * Nommer le site et lire son fuseau sont deux services d'agrément, hébergés
   * ailleurs que PVGIS. Les laisser bloquer le téléchargement revenait à perdre
   * une série d'irradiance parfaitement accessible parce qu'un annuaire
   * n'avait pas répondu. On bascule alors sur une saisie explicite.
   */
  const [manual, setManual] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WeatherResult | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pvgis = useMemo(() => new PvgisClient(), []);
  const geocoding = useMemo(() => new GeocodingClient(), []);
  const max = Math.max(...(preview?.monthly ?? [1]), 0.001);
  const countries = useMemo(() => [...new Set([...ISO_ALPHA2_COUNTRIES, ...localities.map((item) => item.countryCode)])]
    .map((code) => ({ code, name: countryName(code, lang) }))
    .sort((left, right) => left.name.localeCompare(right.name, lang)), [lang, localities]);

  const reset = (nextMode: 'town' | 'gps' | 'file') => {
    abortRef.current?.abort();
    setMode(nextMode);
    setHit(null);
    setManual(false);
    setNotice(null);
    setPreview(null);
    setError(null);
    setOpenedFileName(null);
  };
  const close = () => {
    abortRef.current?.abort();
    onClose();
  };
  const storePreview = async (result: WeatherResult) => {
    setPreview(result);
  };

  const search = async () => {
    const lat = parseNumber(latitude);
    const lon = parseNumber(longitude);
    if (mode === 'town' && town.trim().length === 0) return;
    if (mode === 'gps' && (!isCoordinate(lat, -90, 90) || !isCoordinate(lon, -180, 180))) {
      setError('Renseignez une latitude et une longitude valides.');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPreview(null);
    try {
      let found: GeocodedSite;
      if (mode === 'town') {
        const local = localities.find((item) => item.countryCode === countryCode && item.name.localeCompare(town.trim(), lang, { sensitivity: 'base' }) === 0);
        const localFile = local && weatherFiles.find((file) => file.metadata.localityId === local.id);
        found = local && localFile ? {
          name: local.name, countryCode: local.countryCode,
          latitudeDeg: local.latitudeDeg, longitudeDeg: local.longitudeDeg,
          timezoneIana: localFile.metadata.timezoneIana,
        } : await geocoding.byName({ name: town.trim(), countryCode, language: lang, signal: controller.signal });
      } else {
        const local = nearestCatalogLocality(localities, weatherFiles, lat, lon);
        const localFile = local && weatherFiles.find((file) => file.metadata.localityId === local.id);
        found = local && localFile ? {
          name: local.name, countryCode: local.countryCode,
          latitudeDeg: local.latitudeDeg, longitudeDeg: local.longitudeDeg,
          timezoneIana: localFile.metadata.timezoneIana,
        } : await geocoding.byCoordinates({ latitudeDeg: lat, longitudeDeg: lon, language: lang, signal: controller.signal });
      }
      setHit(found);
      setSiteName(found.name);
      setCountryCode(found.countryCode);
      setLatitude(String(found.latitudeDeg));
      setLongitude(String(found.longitudeDeg));
      setTimezoneIana(found.timezoneIana);
    } catch (cause) {
      setHit(null);
      if (cause instanceof GeocodingError && cause.code === 'GEOCODING_ABORTED') {
        // Recherche annulée par l'utilisateur : rien à signaler.
      } else if (mode === 'gps') {
        // La position est connue : on ouvre la saisie manuelle et on explique,
        // sans présenter l'incident comme une impasse.
        setManual(true);
        setSiteName((current) => current.trim() || '');
        setNotice(`${geocodingErrorMessage(cause, mode, town.trim())} ${t('weather.manualFallback')}`);
      } else {
        setError(geocodingErrorMessage(cause, mode, town.trim()));
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  /**
   * Site retenu pour le téléchargement.
   *
   * Il vient du géocodage quand celui-ci répond, et de la saisie quand il ne
   * répond pas. PVGIS n'a besoin que d'une position ; le nom, le pays et le
   * fuseau complètent le dossier et sont ici fournis à la main, validés de la
   * même façon que dans le mode « Depuis un fichier ».
   */
  const manualHit: GeocodedSite | null = (() => {
    if (!manual || mode !== 'gps') return null;
    const lat = parseNumber(latitude);
    const lon = parseNumber(longitude);
    if (!isCoordinate(lat, -90, 90) || !isCoordinate(lon, -180, 180)) return null;
    if (siteName.trim().length === 0 || !isCountryCode(countryCode) || !isTimezone(timezoneIana)) return null;
    return { name: siteName.trim(), countryCode, latitudeDeg: lat, longitudeDeg: lon, timezoneIana };
  })();
  const resolved = hit ?? manualHit;

  const download = async () => {
    if (!resolved) return;
    const hit = resolved;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    try {
      const catalogFile = weatherFiles.find((file) => distanceKm(
        hit.latitudeDeg,
        hit.longitudeDeg,
        file.metadata.latitudeDeg,
        file.metadata.longitudeDeg,
      ) <= 2);
      if (catalogFile) {
        const source = weatherSources.find((candidate) => candidate.id === catalogFile.metadata.weatherSourceId);
        await storePreview(buildResult({
          file: catalogFile,
          siteName: siteName.trim() || hit.name,
          countryCode: hit.countryCode,
          projectTimezoneIana: catalogFile.metadata.timezoneIana,
          sourceName: source?.sourceName ?? `${siteName.trim() || hit.name} PVGIS-TMY`,
          weatherSourceId: catalogFile.metadata.weatherSourceId,
          locator: catalogFile.metadata.relativePath,
        }));
        return;
      }
      const acquired = await pvgis.downloadTmy({ latitudeDeg: hit.latitudeDeg, longitudeDeg: hit.longitudeDeg, timezoneIana: hit.timezoneIana, signal: controller.signal });
      await storePreview(buildResult({ file: acquired.file, siteName: siteName.trim() || hit.name, countryCode: hit.countryCode, projectTimezoneIana: hit.timezoneIana, sourceName: `${siteName.trim() || hit.name} PVGIS-TMY`, weatherSourceId: acquired.file.metadata.weatherSourceId, locator: acquired.locator }));
    } catch (cause) {
      setPreview(null);
      setError(weatherErrorMessage(cause));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const openFile = async (file: File) => {
    if (!siteName.trim() || !isCountryCode(countryCode) || !isTimezone(timezoneIana)) {
      setError('Renseignez le nom du site, le pays et un fuseau IANA valide avant d’ouvrir le fichier.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const acquired = await pvgis.parseTmyJson({ text, filename: file.name, timezoneIana });
      setOpenedFileName(file.name);
      await storePreview(buildResult({ file: acquired.file, siteName: siteName.trim(), countryCode, projectTimezoneIana: timezoneIana, sourceName: `${siteName.trim()} PVGIS-TMY`, weatherSourceId: acquired.file.metadata.weatherSourceId, locator: acquired.locator }));
    } catch {
      setOpenedFileName(null);
      setPreview(null);
      setError('Fichier refusé : fournissez le JSON TMY horaire original de PVGIS, avec 8 760 lignes G(h), Gb(n) et Gd(h).');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!preview || saving) return;
    setSaving(true);
    setError(null);
    try {
      await onSave(preview);
    } catch {
      setError('Impossible d’enregistrer ce fichier météo dans la bibliothèque locale. Réessayez.');
    } finally {
      setSaving(false);
    }
  };

  return <Dialog title="Télécharger les données d’irradiance d’une localité" lead="PVGIS 5.3 · année type · JSON réel" wide onClose={close} footer={<>
    <button className="btn btn-ghost" onClick={close}>{t('g.cancel')}</button>
    <button className="btn btn-ok" disabled={preview === null || busy || saving} onClick={() => void save()}>{saving ? 'Enregistrement…' : t('weather.save')}</button>
  </>}>
    <div className="dlg-step"><span className="dlg-num">1</span><span className="dlg-step-t">{mode === 'file' ? 'Ouvrir un export PVGIS' : 'Localiser le site'}</span><span className="sep" /><span className="seg">
      <button aria-selected={mode === 'town'} onClick={() => reset('town')}>{t('weather.byName')}</button>
      <button aria-selected={mode === 'gps'} onClick={() => reset('gps')}>{t('weather.byCoordinates')}</button>
      <button aria-selected={mode === 'file'} onClick={() => reset('file')}>{t('weather.fromFile')}</button>
    </span></div>

    {mode === 'file' ? <>
      <div className="form-rows"><label><span>{t('weather.siteName')}</span><input value={siteName} onChange={(event) => { setSiteName(event.target.value); setPreview(null); }} /></label><label><span>{t('weather.country')}</span><select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setPreview(null); }}>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label><span>{t('weather.timezoneIana')}</span><input value={timezoneIana} onChange={(event) => { setTimezoneIana(event.target.value); setPreview(null); }} /></label></div>
      <div className="file-drop" style={{ marginTop: 'var(--sp-3)' }}><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void openFile(file); }} /><button className="btn btn-field" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Lecture…' : openedFileName ? 'Choisir un autre fichier…' : 'Choisir un fichier JSON…'}</button><span className="label">{openedFileName ?? 'Export JSON TMY original de PVGIS · 8 760 heures obligatoires'}</span></div>
    </> : <>
      <div className="form-rows">
        {mode === 'town' ? <><label><span>{t('weather.country')}</span><select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setHit(null); setPreview(null); }}>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label><label><span>{t('weather.city')}</span><input placeholder="ex. Bombouaka" value={town} onChange={(event) => { setTown(event.target.value); setHit(null); setPreview(null); }} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} /></label></> : <><label><span>{t('site.latitude')}</span><input inputMode="decimal" placeholder="10,7030" value={latitude} onChange={(event) => { if (!isDecimalDraft(event.target.value)) return; setLatitude(event.target.value); setHit(null); setPreview(null); }} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} /></label><label><span>{t('site.longitude')}</span><input inputMode="decimal" placeholder="0,2099" value={longitude} onChange={(event) => { if (!isDecimalDraft(event.target.value)) return; setLongitude(event.target.value); setHit(null); setPreview(null); }} onKeyDown={(event) => { if (event.key === 'Enter') void search(); }} /></label></>}
        <label><span aria-hidden="true">&nbsp;</span><button aria-label="Rechercher" className="btn btn-field" disabled={busy || (mode === 'town' ? !town.trim() : !latitude.trim() || !longitude.trim())} onClick={() => void search()}>{busy ? 'Recherche…' : 'Rechercher'}</button></label>
      </div>
      {hit && <div className="form-rows" style={{ marginTop: 'var(--sp-3)' }}><label><span>{t('weather.siteName')}</span><input value={siteName} onChange={(event) => { setSiteName(event.target.value); setPreview(null); }} /></label><label><span>{t('weather.foundCoordinates')}</span><input readOnly value={`${fmt(hit.latitudeDeg, 4)}° / ${fmt(hit.longitudeDeg, 4)}°`} /></label><label><span>{t('weather.foundTimezone')}</span><input readOnly value={hit.timezoneIana} /></label></div>}
      {manual && !hit && mode === 'gps' && <div className="form-rows" style={{ marginTop: 'var(--sp-3)' }}>
        <label><span>{t('weather.siteName')}</span><input autoFocus placeholder={t('weather.siteNamePlaceholder')} value={siteName} onChange={(event) => { setSiteName(event.target.value); setPreview(null); }} /></label>
        <label><span>{t('weather.country')}</span><select value={countryCode} onChange={(event) => { setCountryCode(event.target.value); setPreview(null); }}>{countries.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}</select></label>
        <label><span>{t('weather.timezoneIana')}</span><input aria-invalid={!isTimezone(timezoneIana)} value={timezoneIana} onChange={(event) => { setTimezoneIana(event.target.value); setPreview(null); }} /></label>
      </div>}
    </>}

    {error && <div className="alert warn" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{error}</div>}
    {notice && <div className="alert" role="status" style={{ marginTop: 'var(--sp-3)' }}>{notice}</div>}

    {mode !== 'file' && <div className={`dlg-step ${resolved ? '' : 'is-off'}`}><span className="dlg-num">2</span><span className="dlg-step-t">{t('weather.downloadPreview')}</span><span className="sep" /><span className="label">rien n’est écrit à cette étape</span><button className="btn" disabled={!resolved || busy} onClick={() => void download()}>{busy ? 'Téléchargement…' : preview ? 'Retélécharger' : 'Télécharger'}</button></div>}

    {preview && <><div className="weather-preview"><div className="weather-bars" aria-label="Irradiation mensuelle calculée depuis le fichier">{preview.monthly.map((value, month) => <div key={month}><i aria-hidden="true" style={{ height: `${Math.max(2, value / max * 72)}px` }} /><span>{MONTHS[month]}</span><b>{fmt(value, 1)}</b></div>)}</div><div className="daily-note"><span>{preview.siteName} · {preview.countryCode}</span><span>· {fmt(preview.latitude, 4)}° / {fmt(preview.longitude, 4)}°</span><span className="sep" /><span className="label">SHA-256 {preview.payload.sourceSha256.slice(0, 12)}…</span></div></div><div className="dlg-step"><span className="dlg-num">{mode === 'file' ? '2' : '3'}</span><span className="dlg-step-t">{t('weather.save')}</span><span className="sep" /><span className="label">8 760 heures et leur preuve seront conservées dans la bibliothèque locale</span></div></>}
  </Dialog>;
}

function buildResult(input: { readonly file: CanonicalWeatherFile; readonly siteName: string; readonly countryCode: string; readonly projectTimezoneIana: string | null; readonly sourceName: string; readonly weatherSourceId: string; readonly locator: string }): WeatherResult {
  const payload = canonicalWeatherFileToProjectPayload(input.file);
  const latitude = input.file.document.inputs.location.latitude;
  const longitude = input.file.document.inputs.location.longitude;
  const optimalTilt = clampTilt(0.76 * Math.abs(latitude) + 3.1);
  const optimalAzimuth = latitude >= 0 ? 180 : 0;
  const provenance = { sourceId: input.file.metadata.id, sourceRecordId: input.locator, sourceSha256: input.file.metadata.sourceSha256, transformationVersion: '1.1.0' };
  const analysis = analyzeSolarResource({ latitudeDeg: latitude, longitudeDeg: longitude, surfaceTiltDeg: optimalTilt, surfaceAzimuthDeg: optimalAzimuth, albedo: payload.albedo, intervalMinutes: 60, timestampConvention: 'interval-center', timezoneOffsetMinutes: payload.timezoneOffsetMinutes, observations: [...payload.hourlyIrradiance], minimumOperationalIrradianceWm2: 10, provenance });
  return { siteName: input.siteName, countryCode: input.countryCode, latitude, longitude, timezoneIana: input.projectTimezoneIana, sourceName: input.sourceName, weatherSourceId: input.weatherSourceId, versionOrDate: `TMY ${input.file.metadata.yearMin}–${input.file.metadata.yearMax}`, locator: input.locator, retrievedAtIso: input.file.metadata.retrievedAtIso, payload, monthly: analysis.output.monthlyAverageDailyPoaKWhM2Day, optimalTilt, optimalAzimuth, radiationDatabase: input.file.metadata.radiationDatabase, file: input.file };
}

function parseNumber(value: string): number { return Number(value.replace(',', '.')); }
function isCoordinate(value: number, minimum: number, maximum: number): boolean { return Number.isFinite(value) && value >= minimum && value <= maximum; }
function isCountryCode(value: string): boolean { return /^[A-Z]{2}$/u.test(value); }
function isTimezone(value: string): boolean { try { new Intl.DateTimeFormat('fr', { timeZone: value }); return /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/u.test(value); } catch { return false; } }
function clampTilt(value: number): number { return Math.min(90, Math.max(0, Math.round(value / 5) * 5)); }
function nearestCatalogLocality(
  localities: readonly Locality[],
  weatherFiles: readonly CanonicalWeatherFile[],
  latitudeDeg: number,
  longitudeDeg: number,
) {
  return localities
    .filter((locality) => weatherFiles.some((file) => file.metadata.localityId === locality.id))
    .map((locality) => ({ locality, distance: distanceKm(latitudeDeg, longitudeDeg, locality.latitudeDeg, locality.longitudeDeg) }))
    .filter(({ distance }) => distance <= 2)
    .sort((left, right) => left.distance - right.distance)[0]?.locality;
}
function distanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function weatherErrorMessage(cause: unknown): string {
  if (!(cause instanceof WeatherAcquisitionError)) return 'PVGIS n’a pas fourni un JSON TMY 5.3 valide. Vérifiez le fichier ou la connexion.';
  if (cause.code === 'PVGIS_TIMEOUT') return 'PVGIS n’a pas répondu en 30 secondes. Réessayez.';
  if (cause.code === 'PVGIS_ABORTED') return 'Le téléchargement PVGIS a été annulé.';
  if (cause.code === 'PVGIS_HTTP') return 'PVGIS a refusé la requête. Vérifiez les coordonnées puis réessayez.';
  if (cause.code === 'PVGIS_UNAVAILABLE') return 'PVGIS est momentanément inaccessible. Vérifiez la connexion puis réessayez.';
  return 'PVGIS n’a pas fourni un JSON TMY 5.3 valide.';
}
function geocodingErrorMessage(cause: unknown, mode: 'town' | 'gps' | 'file', town: string): string {
  if (!(cause instanceof GeocodingError)) return 'Le service de localisation est momentanément inaccessible. Vérifiez la connexion puis réessayez.';
  if (cause.code === 'GEOCODING_NOT_FOUND') {
    return mode === 'town'
      ? `Aucune position trouvée pour « ${town} » dans ce pays. Vérifiez l’orthographe ou utilisez les coordonnées GPS.`
      : 'Aucune localité n’a été trouvée à cette position. Vérifiez les coordonnées ou utilisez la recherche par nom.';
  }
  if (cause.code === 'GEOCODING_TIMEOUT') return 'Le service de localisation n’a pas répondu dans le délai prévu. Réessayez.';
  if (cause.code === 'GEOCODING_INVALID') return 'Le service de localisation a renvoyé une réponse inutilisable. Réessayez ou saisissez les coordonnées GPS.';
  return 'Le service de localisation est momentanément inaccessible. Vérifiez la connexion puis réessayez.';
}
