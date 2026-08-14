import { useMemo, useRef, useState } from 'react';
import { analyzeSolarResource } from '@ksd/engine';
import { canonicalWeatherFileToProjectPayload, type ProjectWeatherPayload } from '../../app/adapters/weatherFiles';
import { useCatalog } from '../../app/CatalogProvider';
import { countryName } from '../../app/models/catalogView';
import { fmt } from '../../domain/format';
import { Dialog } from '../../ui/Dialog';
import type { CanonicalWeatherFile } from '../../app/contracts';
import { PvgisClient, WeatherAcquisitionError } from '../../app/adapters/pvgisClient';
import { useT } from '../../i18n';

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
}

export function WeatherDownload({ lang, onClose, onSave }: {
  readonly lang: 'fr' | 'en';
  readonly onClose: () => void;
  readonly onSave: (result: WeatherResult) => void;
}) {
  const t = useT();
  const { localities, weatherSources, weatherFiles } = useCatalog();
  const [mode, setMode] = useState<'town' | 'gps' | 'file'>('town');
  const [selectedFileId, setSelectedFileId] = useState(weatherFiles[0]?.metadata.id ?? '');
  const [siteName, setSiteName] = useState('');
  const [countryCode, setCountryCode] = useState('TG');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [timezoneIana, setTimezoneIana] = useState('Africa/Lome');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<WeatherResult | null>(null);
  const [openedFileName, setOpenedFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const pvgis = useMemo(() => new PvgisClient(), []);

  const selectedCanonical = weatherFiles.find((file) => file.metadata.id === selectedFileId) ?? null;
  const selectedLocality = selectedCanonical === null ? null : localities.find((item) => item.id === selectedCanonical.metadata.localityId) ?? null;
  const selectedSource = selectedCanonical === null ? null : weatherSources.find((item) => item.id === selectedCanonical.metadata.weatherSourceId) ?? null;
  const max = Math.max(...(preview?.monthly ?? [1]), 0.001);
  const catalogChoices = useMemo(() => weatherFiles.map((file) => {
    const locality = localities.find((item) => item.id === file.metadata.localityId);
    return { file, label: locality === undefined ? file.metadata.id : `${locality.name} · ${countryName(locality.countryCode, lang)}` };
  }), [lang, localities, weatherFiles]);

  const reset = (nextMode: 'town' | 'gps' | 'file') => {
    abortRef.current?.abort();
    setMode(nextMode);
    setPreview(null);
    setError(null);
    setOpenedFileName(null);
  };

  const loadCatalogFile = () => {
    if (selectedCanonical === null || selectedLocality === null || selectedSource === null) return;
    setError(null);
    setPreview(buildResult({
      file: selectedCanonical,
      siteName: selectedLocality.name,
      countryCode: selectedLocality.countryCode,
      projectTimezoneIana: selectedCanonical.metadata.timezoneIana,
      sourceName: selectedSource.sourceName,
      weatherSourceId: selectedSource.id,
      locator: selectedCanonical.metadata.relativePath,
    }));
  };

  const download = async () => {
    const lat = parseNumber(latitude);
    const lon = parseNumber(longitude);
    if (!siteName.trim() || !isCountryCode(countryCode) || !isCoordinate(lat, -90, 90) || !isCoordinate(lon, -180, 180) || !isTimezone(timezoneIana)) {
      setError('Renseignez un nom, un code pays, des coordonnées valides et un fuseau IANA avant le téléchargement.');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    try {
      const acquired = await pvgis.downloadTmy({ latitudeDeg: lat, longitudeDeg: lon, timezoneIana, signal: controller.signal });
      setPreview(buildResult({ file: acquired.file, siteName: siteName.trim(), countryCode, projectTimezoneIana: timezoneIana, sourceName: `${siteName.trim()} PVGIS-TMY`, weatherSourceId: acquired.file.metadata.weatherSourceId, locator: acquired.locator }));
    } catch (cause) {
      setPreview(null);
      setError(weatherErrorMessage(cause));
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const openFile = async (file: File) => {
    const declaredTimezone = timezoneIana.trim();
    if (!siteName.trim() || !isCountryCode(countryCode) || (declaredTimezone.length > 0 && !isTimezone(declaredTimezone))) {
      setError('Renseignez le nom du site, le code pays et, si connu, un fuseau IANA valide avant d’ouvrir le fichier.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const acquired = await pvgis.parseTmyJson({ text, filename: file.name, timezoneIana: declaredTimezone || 'UTC' });
      setOpenedFileName(file.name);
      setPreview(buildResult({ file: acquired.file, siteName: siteName.trim(), countryCode, projectTimezoneIana: declaredTimezone || null, sourceName: `${siteName.trim()} PVGIS-TMY`, weatherSourceId: acquired.file.metadata.weatherSourceId, locator: acquired.locator }));
    } catch {
      setOpenedFileName(null);
      setPreview(null);
      setError('Fichier refusé : fournissez le JSON TMY horaire original de PVGIS, avec 8 760 lignes G(h), Gb(n) et Gd(h).');
    } finally {
      setBusy(false);
    }
  };

  return <Dialog title="Télécharger les données d’irradiance d’une localité" lead="PVGIS 5.3 · année type · JSON réel" wide onClose={onClose} footer={<>
    <button className="btn btn-ghost" onClick={onClose}>{t('g.cancel')}</button>
    <button className="btn btn-ok" disabled={preview === null || busy} onClick={() => preview && onSave(preview)}>{t('weather.save')}</button>
  </>}>
    <div className="dlg-step"><span className="dlg-num">1</span><span className="dlg-step-t">Choisir l’origine du fichier réel</span><span className="sep" /><span className="seg">
      <button aria-selected={mode === 'town'} onClick={() => reset('town')}>{t('weather.verifiedFile')}</button>
      <button aria-selected={mode === 'gps'} onClick={() => reset('gps')}>{t('weather.byCoordinates')}</button>
      <button aria-selected={mode === 'file'} onClick={() => reset('file')}>{t('weather.fromFile')}</button>
    </span></div>

    {mode === 'town' ? <div className="form-rows">
      <label><span>{t('weather.localityWithFile')}</span><select value={selectedFileId} onChange={(event) => { setSelectedFileId(event.target.value); setPreview(null); }}>{catalogChoices.map(({ file, label }) => <option key={file.metadata.id} value={file.metadata.id}>{label}</option>)}</select></label>
      <label><span>{t('weather.dataset')}</span><input readOnly value={selectedCanonical === null ? '—' : `${selectedCanonical.metadata.radiationDatabase} · ${selectedCanonical.metadata.yearMin}–${selectedCanonical.metadata.yearMax}`} /></label>
      <label><span aria-hidden="true">&nbsp;</span><button className="btn btn-field" aria-label={t('weather.loadVerified')} disabled={selectedCanonical === null} onClick={loadCatalogFile}>{t('weather.loadVerified')}</button></label>
    </div> : <>
      <div className="form-rows">
        <label><span>{t('weather.siteName')}</span><input placeholder="ex. Bombouaka" value={siteName} onChange={(event) => { setSiteName(event.target.value); setPreview(null); }} /></label>
        <label><span>{t('weather.countryCode')}</span><input maxLength={2} placeholder="TG" value={countryCode} onChange={(event) => { setCountryCode(event.target.value.toUpperCase()); setPreview(null); }} /></label>
        <label><span>{t('weather.timezone')}</span><input placeholder="Africa/Lome" value={timezoneIana} onChange={(event) => { setTimezoneIana(event.target.value); setPreview(null); }} /></label>
      </div>
      {mode === 'gps' ? <div className="form-rows" style={{ marginTop: 'var(--sp-3)' }}>
        <label><span>{t('site.latitude')}</span><input placeholder="10,7030" value={latitude} onChange={(event) => { setLatitude(event.target.value); setPreview(null); }} /></label>
        <label><span>{t('site.longitude')}</span><input placeholder="0,2099" value={longitude} onChange={(event) => { setLongitude(event.target.value); setPreview(null); }} /></label>
        <label><span aria-hidden="true">&nbsp;</span><button className="btn btn-field" disabled={busy} onClick={() => void download()}>{busy ? 'Téléchargement…' : 'Télécharger depuis PVGIS'}</button></label>
      </div> : <div className="file-drop" style={{ marginTop: 'var(--sp-3)' }}>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void openFile(file); }} />
        <button className="btn btn-field" disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? 'Lecture…' : openedFileName ? 'Choisir un autre fichier…' : 'Choisir un fichier JSON…'}</button>
        <span className="label">{openedFileName ?? 'Export JSON TMY original de PVGIS · 8 760 heures obligatoires'}</span>
      </div>}
    </>}

    {error && <div className="alert warn" role="alert" style={{ marginTop: 'var(--sp-3)' }}>{error}</div>}

    <div className="dlg-step" style={{ marginTop: 'var(--sp-4)' }}><span className="dlg-num">2</span><span className="dlg-step-t">Contrôler avant d’enregistrer</span></div>
    {preview === null ? <div className="empty" style={{ margin: 0 }}><b>{t('weather.noCheckedFile')}</b>Chargez le JSON embarqué, téléchargez depuis PVGIS ou ouvrez votre propre export. Aucune courbe n’est simulée.</div> : <>
      <div className="form-rows">
        <label><span>{t('site.locality')}</span><input readOnly value={`${preview.siteName} · ${preview.countryCode}`} /></label>
        <label><span>{t('weather.fileCoordinates')}</span><input readOnly value={`${fmt(preview.latitude, 4)}° · ${fmt(preview.longitude, 4)}°`} /></label>
        <label><span>{t('site.source')}</span><input readOnly value={`${preview.radiationDatabase} · ${preview.versionOrDate}`} /></label>
      </div>
      <div className="weather-preview" style={{ marginTop: 'var(--sp-3)' }}>
        <div className="weather-bars" aria-label="Irradiation mensuelle calculée depuis le fichier">{preview.monthly.map((value, month) => <div key={month}><i style={{ height: `${Math.max(2, value / max * 72)}px` }} /><span>{MONTHS[month]}</span><b>{fmt(value, 1)}</b></div>)}</div>
        <div className="daily-note"><span>{t('site.tilt')} <b>{fmt(preview.optimalTilt, 0)}°</b></span><span>· azimut <b>{fmt(preview.optimalAzimuth, 0)}°</b></span><span className="sep" /><span className="label">SHA-256 {preview.payload.sourceSha256.slice(0, 12)}…</span></div>
      </div>
      {preview.timezoneIana === null && <div className="alert warn" style={{ marginTop: 'var(--sp-3)' }}>{t('weather.utcWarning')}</div>}
    </>}

    <div className="dlg-step" style={{ marginTop: 'var(--sp-4)' }}><span className="dlg-num">3</span><span className="dlg-step-t">{t('weather.saveEvidence')}</span></div>
    <p className="label">Le bouton d’enregistrement conserve les 8 760 lignes, l’empreinte, la période, le fuseau et l’albédo 0,20 dans le dossier. Les graphes sont recalculés à partir de ce contenu.</p>
  </Dialog>;
}

function buildResult(input: { readonly file: CanonicalWeatherFile; readonly siteName: string; readonly countryCode: string; readonly projectTimezoneIana: string | null; readonly sourceName: string; readonly weatherSourceId: string; readonly locator: string }): WeatherResult {
  const payload = canonicalWeatherFileToProjectPayload(input.file);
  const latitude = input.file.document.inputs.location.latitude;
  const longitude = input.file.document.inputs.location.longitude;
  const optimalTilt = clampTilt(0.76 * Math.abs(latitude) + 3.1);
  const optimalAzimuth = latitude >= 0 ? 180 : 0;
  const provenance = { sourceId: input.file.metadata.id, sourceRecordId: input.locator, sourceSha256: input.file.metadata.sourceSha256, transformationVersion: '1.1.0' };
  const analysis = analyzeSolarResource({
    latitudeDeg: latitude, longitudeDeg: longitude, surfaceTiltDeg: optimalTilt, surfaceAzimuthDeg: optimalAzimuth,
    albedo: payload.albedo, intervalMinutes: 60, timestampConvention: 'interval-center', timezoneOffsetMinutes: payload.timezoneOffsetMinutes,
    observations: [...payload.hourlyIrradiance], minimumOperationalIrradianceWm2: 10, provenance,
  });
  return {
    siteName: input.siteName, countryCode: input.countryCode, latitude, longitude, timezoneIana: input.projectTimezoneIana,
    sourceName: input.sourceName, weatherSourceId: input.weatherSourceId,
    versionOrDate: `TMY ${input.file.metadata.yearMin}–${input.file.metadata.yearMax}`,
    locator: input.locator, retrievedAtIso: input.file.metadata.retrievedAtIso, payload,
    monthly: analysis.output.monthlyAverageDailyPoaKWhM2Day,
    optimalTilt, optimalAzimuth, radiationDatabase: input.file.metadata.radiationDatabase,
  };
}

function parseNumber(value: string): number { return Number.parseFloat(value.replace(',', '.')); }
function isCoordinate(value: number, minimum: number, maximum: number): boolean { return Number.isFinite(value) && value >= minimum && value <= maximum; }
function isCountryCode(value: string): boolean { return /^[A-Z]{2}$/u.test(value); }
function isTimezone(value: string): boolean { try { new Intl.DateTimeFormat('fr', { timeZone: value }); return /^[A-Za-z_+-]+(?:\/[A-Za-z0-9_+-]+)+$/u.test(value); } catch { return false; } }
function clampTilt(value: number): number { return Math.min(90, Math.max(0, Math.round(value / 5) * 5)); }
function weatherErrorMessage(cause: unknown): string {
  if (!(cause instanceof WeatherAcquisitionError)) return 'PVGIS n’a pas fourni un JSON TMY 5.3 valide. Vérifiez le fichier ou la connexion.';
  if (cause.code === 'PVGIS_TIMEOUT') return 'PVGIS n’a pas répondu en 30 secondes. Réessayez.';
  if (cause.code === 'PVGIS_ABORTED') return 'Le téléchargement PVGIS a été annulé.';
  if (cause.code === 'PVGIS_HTTP') return 'PVGIS a refusé la requête. Vérifiez les coordonnées puis réessayez.';
  return 'PVGIS n’a pas fourni un JSON TMY 5.3 valide.';
}
